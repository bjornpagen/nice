import { z } from "zod";
import { CanvasImpl } from "@/lib/widgets/utils/canvas-impl";
import { PADDING } from "@/lib/widgets/utils/constants";
import { CSS_COLOR_PATTERN } from "@/lib/widgets/utils/css-color";
import { Path2D } from "@/lib/widgets/utils/path-builder";
import { theme } from "@/lib/widgets/utils/theme";
import * as errors from "@superbuilders/errors";
import * as logger from "@superbuilders/slog";
import { init as initZ3 } from "z3-solver";



// --- START: Zod Schema Definitions (Unchanged) ---

const vertexIdRegex = /^vertex_[A-Za-z0-9_]+$/;
const lineIdRegex = /^line_[A-Za-z0-9_]+$/;
const angleIdRegex = /^angle_[A-Za-z0-9_]+$/;

const LabelSchema = z.object({
  value: z.union([z.number(), z.string()]).describe("A numeric value (e.g., 5, 90) or a string representing a variable or expression (e.g., 'x', '2y') for a line length or angle measure."),
  unit: z.string().nullable().describe("An optional unit for the value (e.g., 'cm', '°'). Set to null if no unit is applicable.")
}).strict().nullable().describe("A structured representation for a label, typically for a line's length or an angle's measure. Use `null` if no label is needed.");

const VertexSchema = z.object({
  id: z.string().regex(vertexIdRegex).describe("A unique identifier for this vertex, which must be prefixed with 'vertex_' (e.g., 'vertex_A', 'vertex_origin')."),
  label: z.string().nullable().describe("An optional display label for the vertex (e.g., 'A', 'P', 'O'). If null, no label is rendered. This is for display only and does not affect the solver.")
}).strict().describe("Defines an abstract point in the geometric construction. **Crucially, you do not specify coordinates.** The final (x, y) position of each vertex is calculated by a constraint solver based on the relationships defined in the `constraints` array.");

const LineSchema = z.object({
  id: z.string().regex(lineIdRegex).describe("A unique identifier for this line, which must be prefixed with 'line_' (e.g., 'line_AB', 'line_hypotenuse')."),
  from: z.string().regex(vertexIdRegex).describe("The ID of the vertex where the line begins."),
  to: z.string().regex(vertexIdRegex).describe("The ID of the vertex that defines the line's end point or direction."),
  isRay: z.boolean().default(false).describe("If true, the line starts at 'from' and extends infinitely in the direction of 'to'. If false, it is a finite segment connecting the two vertices."),
  style: z.enum(["solid", "dashed"]).default("solid").describe("The visual style of the line for rendering."),
  label: LabelSchema.optional().describe("An optional structured label for the line, typically used to display its length.")
}).strict().describe("Represents a linear element, which can be a finite segment or an infinite ray, connecting two vertices.");

const AngleVisualizationSchema = z.object({
  type: z.enum(["arc", "right", "none"]).default("arc").describe("The visual style for the angle marker: 'arc' for a curved line, 'right' for a square symbol (for 90° angles), or 'none' for no visual marker."),
  radius: z.number().positive().optional().describe("For 'arc' type, the radius of the arc in pixels. If not provided, a default will be used."),
  color: z.string().regex(CSS_COLOR_PATTERN, "Invalid CSS color; use hex (#RGB, #RRGGBB, #RRGGBBAA)").describe("The CSS color for the angle marker (arc or square) and its accompanying label."),
  xAxisRotation: z.number().default(0).describe("For 'arc' type, the rotation of the arc's ellipse in degrees. Typically 0 for a standard circular arc."),
  largeArcFlag: z.literal(0).or(z.literal(1)).default(0).describe("The SVG large-arc-flag: 0 for angles less than 180°, 1 for angles greater than 180°."),
  sweepFlag: z.literal(0).or(z.literal(1)).default(1).describe("The SVG sweep-flag: 1 for clockwise direction (positive angle), 0 for counter-clockwise (negative angle)."),
  label: z.string().nullable().describe("The text label to display near the angle marker (e.g., '108°', 'θ'). If null, no label is rendered."),
  labelPositionHint: z.enum(["auto", "outside", "inside"]).default("auto").describe("A hint for the renderer to place the label 'inside' or 'outside' the angle's polygon, or to decide automatically.")
}).strict().describe("Describes how an angle should be visually represented, mirroring styles seen in Khan Academy for clarity and precision.");

const ConstraintSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("angle"),
    id: z.string().regex(angleIdRegex).describe("A unique identifier for this angle constraint, prefixed with 'angle_' (e.g., 'angle_ABC')."),
    vertex: z.string().regex(vertexIdRegex).describe("The ID of the vertex where the angle is formed."),
    line1: z.string().regex(lineIdRegex).describe("The ID of the first line forming the angle."),
    line2: z.string().regex(lineIdRegex).describe("The ID of the second line forming the angle."),
    measure: z.number().describe("The measure of the angle in degrees (e.g., 90, 108). This value must be numeric."),
    visualization: AngleVisualizationSchema.describe("Configuration for how the angle should be drawn (e.g., with an arc, its color, and label).")
  }).strict().describe("Fixes the measure of the angle at a specific vertex formed by two lines."),
  z.object({
    type: z.literal("equalLength"),
    lines: z.array(z.string().regex(lineIdRegex)).min(2).describe("An array of two or more line IDs that should be constrained to have the same length."),
    value: z.number().optional().describe("An optional numeric value. If provided, all specified lines will be forced to this exact length.")
  }).strict().describe("Forces multiple lines to have the same length."),
  z.object({
    type: z.literal("equalAngle"),
    angles: z.array(z.string().regex(angleIdRegex)).min(2).describe("An array of two or more angle IDs that should be constrained to have the same measure."),
    value: z.number().optional().describe("An optional numeric value. If provided, all specified angles will be forced to this exact measure in degrees.")
  }).strict().describe("Forces multiple angles to have the same measure."),
  z.object({
    type: z.literal("parallel"),
    lines: z.array(z.string().regex(lineIdRegex)).min(2).describe("An array of two or more line IDs that must be parallel to each other.")
  }).strict().describe("Forces a set of lines to be parallel."),
  z.object({
    type: z.literal("perpendicular"),
    lines: z.array(z.string().regex(lineIdRegex)).min(2).describe("An array of two or more line IDs that must be perpendicular (form 90° angles) to each other.")
  }).strict().describe("Forces a set of lines to be perpendicular."),
  z.object({
    type: z.literal("symmetry"),
    axisLine: z.string().regex(lineIdRegex).optional().describe("The ID of a line to be used as the axis of symmetry."),
    axisType: z.enum(["horizontal", "vertical"]).optional().describe("If no axisLine is provided, specifies a global canvas axis for symmetry ('horizontal' or 'vertical')."),
    elements: z.array(z.union([z.string().regex(vertexIdRegex), z.string().regex(lineIdRegex)])).min(2).describe("An array of vertex or line IDs to be made symmetric with respect to the axis.")
  }).strict().describe("Defines an axial symmetry relationship between a set of geometric elements."),
  z.object({
    type: z.literal("intersect"),
    id: z.string().regex(vertexIdRegex).describe("A new, unique ID for the virtual vertex that will be created at the intersection, prefixed with 'vertex_'."),
    line1: z.string().regex(lineIdRegex).describe("The ID of the first intersecting line."),
    line2: z.string().regex(lineIdRegex).describe("The ID of the second intersecting line."),
    label: z.string().nullable().optional().describe("An optional display label for the new intersection vertex.")
  }).strict().describe("Creates a 'virtual' vertex at the intersection of two lines. This new vertex can then be used in other constraints or for drawing."),
  z.object({
    type: z.literal("midpoint"),
    id: z.string().regex(vertexIdRegex).describe("A new, unique ID for the virtual vertex that will be created at the midpoint, prefixed with 'vertex_'."),
    line: z.string().regex(lineIdRegex).describe("The ID of the line on which to create the midpoint."),
    label: z.string().nullable().optional().describe("An optional display label for the new midpoint vertex.")
  }).strict().describe("Creates a 'virtual' vertex at the midpoint of a specified line."),
  z.object({
    type: z.literal("presetPolygon"),
    vertices: z.array(z.string().regex(vertexIdRegex)).min(3).describe("An ordered array of vertex IDs that form the vertices of the polygon."),
    isRegular: z.boolean().default(true).describe("If true, the solver will automatically generate the necessary 'equalLength' and 'equalAngle' sub-constraints to form a regular polygon."),
    sideLength: z.number().optional().describe("An optional numeric value for the side length. If provided, all sides of the polygon will be set to this length."),
    closed: z.boolean().default(true).describe("If true, the last vertex is connected to the first to form a closed shape.")
  }).strict().describe("A high-level convenience constraint for creating polygons like triangles, squares, and pentagons. Simplifies diagram creation by auto-generating sub-constraints.")
]).describe("The core of the diagram. This is an array of rules that define the geometric properties and relationships between vertices and lines. The solver uses these constraints to determine the final layout.");

const ShadedRegionSchema = z.object({
  vertices: z.array(z.string().regex(vertexIdRegex)).min(3).describe("An ordered list of at least three vertex IDs that form the boundary of the region to be shaded."),
  fillColor: z.string().regex(CSS_COLOR_PATTERN).describe("The CSS fill color for the shaded area (e.g., '#FFE5CC', '#RRGGBBAA' for transparency)."),
  opacity: z.number().min(0).max(1).default(1).describe("The opacity of the fill color, from 0 (transparent) to 1 (opaque).")
}).strict().describe("Defines a shaded polygonal area, specified by a sequence of vertices.");

const RegionLabelSchema = z.object({
  text: z.string().describe("The content of the label to be displayed (e.g., 'Area A', '108°', 'x')."),
  placement: z.union([
    z.object({
      type: z.literal("centroid"),
      vertices: z.array(z.string().regex(vertexIdRegex)).min(3).describe("An array of vertex IDs defining a polygon. The label will be placed at the geometric center (centroid) of these vertices.")
    }).strict(),
    z.object({
      type: z.literal("alongLine"),
      line: z.string().regex(lineIdRegex).describe("The ID of the line along which the label should be placed."),
      offset: z.number().describe("A normalized offset from the line's start point (0.0) to its end point (1.0). For example, 0.5 places the label at the midpoint.")
    }).strict()
  ]).describe("Defines the placement strategy for the label: either at the 'centroid' of a region or at a specific 'alongLine' offset."),
  color: z.string().regex(CSS_COLOR_PATTERN).optional().describe("An optional CSS color for the label text. If not provided, a default theme color will be used.")
}).strict().describe("Defines a text label that is placed intelligently within the diagram, either relative to a region or a line.");

export const ConstraintGeometryDiagramPropsSchema = z.object({
  type: z.literal("constraintGeometryDiagram").describe("Identifies this widget as a pure constraint-based geometric diagram."),
  width: z.number().positive().describe("The total width of the SVG canvas in pixels."),
  height: z.number().positive().describe("The total height of the SVG canvas in pixels."),
  vertices: z.array(VertexSchema).min(1).describe("An array of all vertices to be used in the diagram. Their coordinates are not specified here; they are determined by the solver."),
  lines: z.array(LineSchema).min(0).describe("An array of all lines (segments or rays) connecting the vertices."),
  constraints: z.array(ConstraintSchema).min(1).describe("An array of geometric constraints that define the relationships between vertices and lines. The solver uses these to construct the final diagram."),
  shadedRegions: z.array(ShadedRegionSchema).optional().describe("An optional array of polygonal areas to be shaded with a specified color."),
  regionLabels: z.array(RegionLabelSchema).optional().describe("An optional array of text labels to be placed within the diagram."),
  layoutHint: z.enum(["circle", "grid", "linear"]).optional().describe("An optional hint to the solver for an initial layout strategy, which can help with convergence for complex diagrams.")
}).strict().describe("Describes a complete geometric diagram defined by constraints rather than explicit coordinates. This powerful approach allows for the creation of precise figures by specifying relationships (e.g., 'these lines are parallel', 'this angle is 90°'). The system uses the Z3 solver to find valid coordinates that satisfy all constraints.");

// --- Helper Types ---

type Point = { x: number; y: number };
type SolvedPositions = Map<string, Point>;
type LineDef = z.infer<typeof LineSchema>;
type VertexDef = z.infer<typeof VertexSchema>;
type ScreenLine = { a: Point; b: Point; id: string };
type ConstraintDef = z.infer<typeof ConstraintSchema>;

// --- Z3 Solver Implementation ---

/**
 * Translates the geometric schema into a set of mathematical constraints
 * and solves for the vertex coordinates using the Z3 SMT solver.
 */
async function solveWithZ3(props: z.infer<typeof ConstraintGeometryDiagramPropsSchema>): Promise<SolvedPositions> {
    const initResult = await errors.try<Awaited<ReturnType<typeof initZ3>>>(initZ3())
    if (initResult.error) {
        logger.error("z3 init", { error: initResult.error })
        throw errors.wrap(initResult.error, "z3 init")
    }
    const { Context } = initResult.data
    const Z = Context("main")
    type Arith = ReturnType<typeof Z.Real.const>
    const solver = new Z.Solver()

    const allVertices = new Map<string, VertexDef>(props.vertices.map(v => [v.id, v]))
    props.constraints.forEach(c => {
        if (c.type === "intersect" || c.type === "midpoint") {
            allVertices.set(c.id, { id: c.id, label: c.label ?? null })
        }
    })

    const vars = new Map(
      Array.from(allVertices.keys()).map(id => {
        const cleanId = id.replace(/vertex_/g, "")
        return [
          id,
          {
            x: Z.Real.const(`${cleanId}_x`),
            y: Z.Real.const(`${cleanId}_y`)
          }
        ] as const
      })
    )
    
    // --- Pre-processing: De-sugar high-level constraints ---
    const expandedConstraints: ConstraintDef[] = []
    for (const c of props.constraints) {
      if (c.type === "presetPolygon" && c.isRegular) {
        const n = c.vertices.length
        const sideLines: string[] = []
            for (let i = 0; i < n; i++) {
          const next = (i + 1) % n
                const lineId = props.lines.find(l => 
            (l.from === c.vertices[i] && l.to === c.vertices[next]) ||
            (l.to === c.vertices[i] && l.from === c.vertices[next])
          )?.id
          if (lineId) sideLines.push(lineId)
        }
        if (sideLines.length === n) {
          expandedConstraints.push({ type: "equalLength", lines: sideLines, value: c.sideLength })
        }
        } else {
        expandedConstraints.push(c)
        }
    }


    // --- Constraint Translation ---
    // Build lookup for angle constraints by id for equalAngle
    const anglesById = new Map<string, Extract<ConstraintDef, { type: "angle" }>>()
    for (const c of expandedConstraints) {
      if (c.type === "angle") anglesById.set(c.id, c)
    }

    for (const c of expandedConstraints) {
        switch (c.type) {
            
            case 'equalLength': {
                const lineDefs = c.lines.map(id => props.lines.find(l => l.id === id)).filter((x): x is LineDef => Boolean(x))
                if (lineDefs.length === 0) {
                  logger.error("solver equalLength no lines")
                  throw errors.new("solver: invalid equalLength")
                }
                const base = lineDefs[0]!
                const rest = lineDefs.slice(1)
                const v1 = vars.get(base.from)
                const v2 = vars.get(base.to)
                if (!v1 || !v2) {
                  logger.error("solver equalLength base vertices missing")
                  throw errors.new("solver: vertex missing")
                }
                const baseDistSq = v1.x.sub(v2.x).mul(v1.x.sub(v2.x)).add(v1.y.sub(v2.y).mul(v1.y.sub(v2.y)))
                for (const l2 of rest) {
                  const v3 = vars.get(l2.from), v4 = vars.get(l2.to)
                  if (!v3 || !v4) {
                    logger.error("solver equalLength compare vertices missing")
                    throw errors.new("solver: vertex missing")
                  }
                  const distSq2 = v3.x.sub(v4.x).mul(v3.x.sub(v4.x)).add(v3.y.sub(v4.y).mul(v3.y.sub(v4.y)))
                  solver.add(baseDistSq.eq(distSq2))
                }
                if (c.value !== undefined) {
                  solver.add(baseDistSq.eq(c.value * c.value))
                }
                break
            }
             case 'perpendicular': {
                const l1 = props.lines.find(l=>l.id === c.lines[0])
                const l2 = props.lines.find(l=>l.id === c.lines[1])
                if (!l1 || !l2) {
                  logger.error("solver perpendicular lines not found", { lines: c.lines })
                  throw errors.new("solver: line missing")
                }
                const v1 = vars.get(l1.from), v2 = vars.get(l1.to)
                const v3 = vars.get(l2.from), v4 = vars.get(l2.to)
                if (!v1 || !v2 || !v3 || !v4) {
                  logger.error("solver perpendicular vertex missing")
                  throw errors.new("solver: vertex missing")
                }
                const dotProduct = (v2.x.sub(v1.x)).mul(v4.x.sub(v3.x)).add((v2.y.sub(v1.y)).mul(v4.y.sub(v3.y)));
                solver.add(dotProduct.eq(0));
                break
            }
            case 'parallel': {
                const l1 = props.lines.find(l=>l.id === c.lines[0])
                const l2 = props.lines.find(l=>l.id === c.lines[1])
                if (!l1 || !l2) {
                  logger.error("solver parallel lines not found", { lines: c.lines })
                  throw errors.new("solver: line missing")
                }
                const v1 = vars.get(l1.from), v2 = vars.get(l1.to)
                const v3 = vars.get(l2.from), v4 = vars.get(l2.to)
                if (!v1 || !v2 || !v3 || !v4) {
                  logger.error("solver parallel vertex missing")
                  throw errors.new("solver: vertex missing")
                }
                const crossProduct = (v2.x.sub(v1.x)).mul(v4.y.sub(v3.y)).sub((v2.y.sub(v1.y)).mul(v4.x.sub(v3.x)));
                solver.add(crossProduct.eq(0));
                break
            }
            case 'midpoint': {
                const line = props.lines.find(l => l.id === c.line)
                if (!line) {
                  logger.error("solver midpoint line not found", { lineId: c.line })
                  throw errors.new("solver: line missing")
                }
                const vM = vars.get(c.id)
                const v1 = vars.get(line.from), v2 = vars.get(line.to)
                if (!vM || !v1 || !v2) {
                  logger.error("solver midpoint vertex missing")
                  throw errors.new("solver: vertex missing")
                }
                solver.add(vM.x.mul(2).eq(v1.x.add(v2.x)));
                solver.add(vM.y.mul(2).eq(v1.y.add(v2.y)));
                break
            }
            case 'angle': {
                const line1 = props.lines.find(l=>l.id === c.line1), line2 = props.lines.find(l=>l.id === c.line2)
                if (!line1 || !line2) {
                  logger.error("solver angle lines not found", { line1: c.line1, line2: c.line2 })
                  throw errors.new("solver: line missing")
                }
                const vA = vars.get(c.vertex)
                const vB = vars.get(line1.from === c.vertex ? line1.to : line1.from)
                const vC = vars.get(line2.from === c.vertex ? line2.to : line2.from)
                if (!vA || !vB || !vC) {
                  logger.error("solver angle vertex missing")
                  throw errors.new("solver: vertex missing")
                }
                
                const rad = c.measure * Math.PI / 180;
                const cosTheta = Math.cos(rad);

                const vecAB = { x: vB.x.sub(vA.x), y: vB.y.sub(vA.y) };
                const vecAC = { x: vC.x.sub(vA.x), y: vC.y.sub(vA.y) };

                const dot = vecAB.x.mul(vecAC.x).add(vecAB.y.mul(vecAC.y));
                const distSqAB = vecAB.x.mul(vecAB.x).add(vecAB.y.mul(vecAB.y));
                const distSqAC = vecAC.x.mul(vecAC.x).add(vecAC.y.mul(vecAC.y));

                // dot^2 = |AB|^2 * |AC|^2 * cos^2(theta)
                solver.add(dot.mul(dot).eq(distSqAB.mul(distSqAC).mul(cosTheta * cosTheta)));
                
                // Disambiguate angle with cross product's sign
                const crossZ = vecAC.x.mul(vecAB.y).sub(vecAC.y.mul(vecAB.x));
                const sweepFlag = c.visualization.sweepFlag;
                if(sweepFlag === 1) solver.add(crossZ.ge(0));
                else solver.add(crossZ.le(0));

                break
            }
            case 'intersect': {
                const l1 = props.lines.find(l => l.id === c.line1)
                const l2 = props.lines.find(l => l.id === c.line2)
                if (!l1 || !l2) {
                  logger.error("solver intersect lines not found", { line1: c.line1, line2: c.line2 })
                  throw errors.new("solver: line missing")
                }
                const vA = vars.get(l1.from)
                const vB = vars.get(l1.to)
                const vC = vars.get(l2.from)
                const vD = vars.get(l2.to)
                const vX = vars.get(c.id)
                if (!vA || !vB || !vC || !vD || !vX) {
                  logger.error("solver intersect vertex missing")
                  throw errors.new("solver: vertex missing")
                }
                const t = Z.Real.const(`${c.id}_t`)
                const u = Z.Real.const(`${c.id}_u`)
                solver.add(
                  vX.x.eq(vA.x.add(vB.x.sub(vA.x).mul(t))),
                  vX.y.eq(vA.y.add(vB.y.sub(vA.y).mul(t)))
                )
                solver.add(
                  vX.x.eq(vC.x.add(vD.x.sub(vC.x).mul(u))),
                  vX.y.eq(vC.y.add(vD.y.sub(vC.y).mul(u)))
                )
                break
            }
            case 'equalAngle': {
                const angleIds = c.angles
                if (angleIds.length < 2) {
                  logger.error("solver equalAngle requires at least two angles")
                  throw errors.new("solver: invalid equalAngle")
                }
                const [refId, ...restAngleIds] = angleIds
                // Establish a reference angle
                const ref = anglesById.get(refId as string)
                if (!ref) {
                  logger.error("solver equalAngle reference not found", { angleId: refId })
                  throw errors.new("solver: angle missing")
                }
                const refLine1 = props.lines.find(l => l.id === ref.line1) as LineDef | undefined
                const refLine2 = props.lines.find(l => l.id === ref.line2) as LineDef | undefined
                if (!refLine1 || !refLine2) {
                  logger.error("solver equalAngle reference lines missing")
                  throw errors.new("solver: line missing")
                }
                const vA = vars.get(ref.vertex)
                const vB = vars.get(refLine1.from === ref.vertex ? refLine1.to : refLine1.from)
                const vC = vars.get(refLine2.from === ref.vertex ? refLine2.to : refLine2.from)
                if (!vA || !vB || !vC) {
                  logger.error("solver equalAngle reference vertices missing")
                  throw errors.new("solver: vertex missing")
                }
                const refABx = vB.x.sub(vA.x), refABy = vB.y.sub(vA.y)
                const refACx = vC.x.sub(vA.x), refACy = vC.y.sub(vA.y)
                const refDot = refABx.mul(refACx).add(refABy.mul(refACy))
                const refLenSqAB = refABx.mul(refABx).add(refABy.mul(refABy))
                const refLenSqAC = refACx.mul(refACx).add(refACy.mul(refACy))

                for (let i = 0; i < restAngleIds.length; i++) {
                  const ai = anglesById.get(restAngleIds[i] as string)
                  if (!ai) {
                    logger.error("solver equalAngle angle missing", { angleId: restAngleIds[i] })
                    throw errors.new("solver: angle missing")
                  }
                  const l1 = props.lines.find(l => l.id === ai.line1) as LineDef | undefined
                  const l2 = props.lines.find(l => l.id === ai.line2) as LineDef | undefined
                  if (!l1 || !l2) {
                    logger.error("solver equalAngle lines missing")
                    throw errors.new("solver: line missing")
                  }
                  const vA2 = vars.get(ai.vertex)
                  const vB2 = vars.get(l1.from === ai.vertex ? l1.to : l1.from)
                  const vC2 = vars.get(l2.from === ai.vertex ? l2.to : l2.from)
                  if (!vA2 || !vB2 || !vC2) {
                    logger.error("solver equalAngle vertices missing")
                    throw errors.new("solver: vertex missing")
                  }
                  const abx = vB2.x.sub(vA2.x), aby = vB2.y.sub(vA2.y)
                  const acx = vC2.x.sub(vA2.x), acy = vC2.y.sub(vA2.y)
                  const dot = abx.mul(acx).add(aby.mul(acy))
                  const lenSqAB = abx.mul(abx).add(aby.mul(aby))
                  const lenSqAC = acx.mul(acx).add(acy.mul(acy))
                  // Normalize and equate squared cosines to avoid division
                  solver.add(dot.mul(dot).mul(refLenSqAB.mul(refLenSqAC)).eq(refDot.mul(refDot).mul(lenSqAB.mul(lenSqAC))))
                }
                if (c.value !== undefined) {
                  const rad = c.value * Math.PI / 180
                  const cosTheta = Math.cos(rad)
                  solver.add(refDot.mul(refDot).eq(refLenSqAB.mul(refLenSqAC).mul(cosTheta * cosTheta)))
                }
                break
            }
            case 'symmetry': {
                // Pairwise symmetry of elements across axis
                const elems = c.elements
                if (elems.length % 2 !== 0) {
                  logger.error("solver symmetry requires element pairs", { count: elems.length })
                  throw errors.new("solver: invalid symmetry")
                }
                const applyVertexPairAcrossAxis = (pId: string, qId: string, axisVec: { x: Arith; y: Arith }, axisPoint?: { x: Arith; y: Arith }) => {
                  const p = vars.get(pId)
                  const q = vars.get(qId)
                  if (!p || !q) {
                    logger.error("solver symmetry vertex missing")
                    throw errors.new("solver: vertex missing")
                  }
                  if (axisPoint) {
                    // Midpoint lies on axis line: m = a + t*(b-a)
                    const t = Z.Real.const(`sym_${pId}_${qId}_t`)
                    const mx = p.x.add(q.x).div(2)
                    const my = p.y.add(q.y).div(2)
                    solver.add(mx.eq(axisPoint.x.add(axisVec.x.mul(t))))
                    solver.add(my.eq(axisPoint.y.add(axisVec.y.mul(t))))
                    // (q - p) dot axisVec = 0
                    solver.add(q.x.sub(p.x).mul(axisVec.x).add(q.y.sub(p.y).mul(axisVec.y)).eq(0))
                  } else {
                    // axisType: horizontal or vertical through canvas center
                    if (c.axisType === "horizontal") {
                      const centerY = props.height / 2
                      solver.add(p.y.add(q.y).div(2).eq(centerY))
                      solver.add(q.x.sub(p.x).mul(1).add(q.y.sub(p.y).mul(0)).eq(0))
                    } else if (c.axisType === "vertical") {
                      const centerX = props.width / 2
                      solver.add(p.x.add(q.x).div(2).eq(centerX))
                      solver.add(q.x.sub(p.x).mul(0).add(q.y.sub(p.y).mul(1)).eq(0))
                    } else {
                      logger.error("solver symmetry axisType missing")
                      throw errors.new("solver: invalid symmetry axis")
                    }
                  }
                }

                // Determine axis
                let axisVec: { x: Arith; y: Arith } | null = null
                let axisPoint: { x: Arith; y: Arith } | undefined
                if (c.axisLine) {
                  const axis = props.lines.find(l => l.id === c.axisLine)
                  if (!axis) {
                    logger.error("solver symmetry axis line missing", { axisLine: c.axisLine })
                    throw errors.new("solver: line missing")
                  }
                  const a = vars.get(axis.from)
                  const b = vars.get(axis.to)
                  if (!a || !b) {
                    logger.error("solver symmetry axis vertices missing")
                    throw errors.new("solver: vertex missing")
                  }
                  axisVec = { x: b.x.sub(a.x), y: b.y.sub(a.y) }
                  axisPoint = { x: a.x, y: a.y }
                }

                const pairCount = Math.floor(elems.length / 2)
                for (let i = 0; i < pairCount; i++) {
                  const e1 = elems[i * 2]
                  const e2 = elems[i * 2 + 1]
                  if (!e1 || !e2) {
                    logger.error("solver symmetry element undefined")
                    throw errors.new("solver: invalid symmetry elements")
                  }
                  const isVertex1 = e1.startsWith("vertex_")
                  const isVertex2 = e2.startsWith("vertex_")
                  const isLine1 = e1.startsWith("line_")
                  const isLine2 = e2.startsWith("line_")
                  if (isVertex1 && isVertex2) {
                    if (axisVec && axisPoint) applyVertexPairAcrossAxis(e1, e2, axisVec, axisPoint)
                    else {
                      if (c.axisType === "horizontal") {
                        const p = vars.get(e1), q = vars.get(e2)
                        if (!p || !q) throw errors.new("solver: vertex missing")
                        const centerY = Z.Real.val(props.height / 2)
                        solver.add(p.y.add(q.y).div(2).eq(centerY))
                        solver.add(q.x.eq(p.x))
                      } else if (c.axisType === "vertical") {
                        const p = vars.get(e1), q = vars.get(e2)
                        if (!p || !q) throw errors.new("solver: vertex missing")
                        const centerX = Z.Real.val(props.width / 2)
                        solver.add(p.x.add(q.x).div(2).eq(centerX))
                        solver.add(q.y.eq(p.y))
                      } else {
                        logger.error("solver symmetry axisType missing")
                        throw errors.new("solver: invalid symmetry axis")
                      }
                    }
                  } else if (isLine1 && isLine2) {
                    const l1 = props.lines.find(l => l.id === e1)
                    const l2 = props.lines.find(l => l.id === e2)
                    if (!l1 || !l2) {
                      logger.error("solver symmetry line missing")
                      throw errors.new("solver: line missing")
                    }
                    if (axisVec && axisPoint) {
                      applyVertexPairAcrossAxis(l1.from, l2.from, axisVec, axisPoint)
                      applyVertexPairAcrossAxis(l1.to, l2.to, axisVec, axisPoint)
                    } else {
                      if (c.axisType === "horizontal") {
                        const pf = vars.get(l1.from), qf = vars.get(l2.from)
                        const pt = vars.get(l1.to), qt = vars.get(l2.to)
                        if (!pf || !qf || !pt || !qt) throw errors.new("solver: vertex missing")
                        const centerY = Z.Real.val(props.height / 2)
                        solver.add(pf.y.add(qf.y).div(2).eq(centerY))
                        solver.add(qf.x.eq(pf.x))
                        solver.add(pt.y.add(qt.y).div(2).eq(centerY))
                        solver.add(qt.x.eq(pt.x))
                      } else if (c.axisType === "vertical") {
                        const pf = vars.get(l1.from), qf = vars.get(l2.from)
                        const pt = vars.get(l1.to), qt = vars.get(l2.to)
                        if (!pf || !qf || !pt || !qt) throw errors.new("solver: vertex missing")
                        const centerX = Z.Real.val(props.width / 2)
                        solver.add(pf.x.add(qf.x).div(2).eq(centerX))
                        solver.add(qf.y.eq(pf.y))
                        solver.add(pt.x.add(qt.x).div(2).eq(centerX))
                        solver.add(qt.y.eq(pt.y))
                      } else {
                        logger.error("solver symmetry axisType missing")
                        throw errors.new("solver: invalid symmetry axis")
                      }
                    }
                  } else {
                    logger.error("solver symmetry element types mismatch", { e1, e2 })
                    throw errors.new("solver: invalid symmetry elements")
                  }
                }
                break
            }
        }
    }
    
    // --- Solve and Extract Model ---
    const isSat = await solver.check()
    if (isSat !== "sat") {
        logger.error("solver unsat", { status: isSat })
        throw errors.new("solver: unsat")
    }

    const model = solver.model()
    // Arbitrary anchoring: translate solution so the first declared vertex sits at a deterministic canvas origin
    const firstVertexId = props.vertices[0]?.id
    if (!firstVertexId) {
      logger.error("solver no vertices")
      throw errors.new("solver: no vertices")
    }
    const parseModelNumber = (s: string): number => {
      const clean = s.replace(/\?/g, "")
      if (clean.includes("/")) {
        const [n, d] = clean.split("/")
        const num = Number(n)
        const den = Number(d)
        if (!Number.isFinite(num) || !Number.isFinite(den) || den === 0) {
          logger.error("solver model value invalid", { value: s })
          throw errors.new("solver: model value invalid")
        }
        return num / den
      }
      const val = Number(clean)
      if (!Number.isFinite(val)) {
        logger.error("solver model value invalid", { value: s })
        throw errors.new("solver: model value invalid")
      }
      return val
    }
    const solvedPositions: SolvedPositions = new Map()
    for (const [id, v] of vars.entries()) {
      const xAst = model.get(v.x)
      const yAst = model.get(v.y)
      if (!xAst || !yAst) {
        logger.error("solver model missing coordinate", { vertexId: id })
        throw errors.new("solver: model value missing")
      }
      const x = parseModelNumber(xAst.toString())
      const y = parseModelNumber(yAst.toString())
      solvedPositions.set(id, { x, y })
    }

    // Translate so first vertex is placed at a deterministic origin (padding offset)
    const first = solvedPositions.get(firstVertexId)
    if (!first) {
      logger.error("solver first vertex missing in model", { vertexId: firstVertexId })
      throw errors.new("solver: model value missing")
    }
    const dx = (PADDING * 2) - first.x
    const dy = (PADDING * 2) - first.y
    for (const [id, p] of solvedPositions.entries()) {
      solvedPositions.set(id, { x: p.x + dx, y: p.y + dy })
    }
    return solvedPositions
}


// --- Main Generator Function (Async) ---
export const generateConstraintGeometryDiagram = async (props: z.infer<typeof ConstraintGeometryDiagramPropsSchema>): Promise<string> => {
    const { width, height, lines, constraints } = props
    const canvas = new CanvasImpl({ chartArea: { left: 0, top: 0, width, height }, fontPxDefault: 12, lineHeightDefault: 1.2 })
    
    const solvedPositions = await solveWithZ3(props)

    const allVertices = new Map<string, VertexDef>(props.vertices.map(v => [v.id, v]))
     props.constraints.forEach(c => {
      if (c.type === "intersect" || c.type === "midpoint") {
        allVertices.set(c.id, { id: c.id, label: c.label ?? null })
      }
    })

    // --- Geometry helpers for collision avoidance ---
    const segmentIntersectsRect = (A: Point, B: Point, rect: { x: number; y: number; width: number; height: number; pad?: number }): boolean => {
      const pad = rect.pad ?? 0
      const rx = rect.x - pad, ry = rect.y - pad, rw = rect.width + 2 * pad, rh = rect.height + 2 * pad
      const minX = Math.min(A.x, B.x), maxX = Math.max(A.x, B.x)
      const minY = Math.min(A.y, B.y), maxY = Math.max(A.y, B.y)
      if (maxX < rx || minX > rx + rw || maxY < ry || minY > ry + rh) return false
      const r1 = { x: rx, y: ry }, r2 = { x: rx + rw, y: ry }
      const r3 = { x: rx + rw, y: ry + rh }, r4 = { x: rx, y: ry + rh }
      const segmentsIntersect = (p1: Point, p2: Point, p3: Point, p4: Point): boolean => {
        const o = (a: Point, b: Point, c: Point) => {
          const val = (b.y - a.y) * (c.x - b.x) - (b.x - a.x) * (c.y - b.y)
          return val > 1e-9 ? 1 : val < -1e-9 ? -1 : 0
        }
        const o1 = o(p1, p2, p3), o2 = o(p1, p2, p4), o3 = o(p3, p4, p1), o4 = o(p3, p4, p2)
        return o1 !== o2 && o3 !== o4
      }
      return segmentsIntersect(A, B, r1, r2) || segmentsIntersect(A, B, r2, r3) || segmentsIntersect(A, B, r3, r4) || segmentsIntersect(A, B, r4, r1)
    }

    // --- Drawing Phase ---
    if (props.shadedRegions) {
      props.shadedRegions.forEach(region => {
        const points = region.vertices.map(vid => solvedPositions.get(vid)).filter((p): p is Point => !!p)
        if (points.length >= 3) canvas.drawPolygon(points, { fill: region.fillColor, fillOpacity: region.opacity })
      })
    }
    
    const screenLines: ScreenLine[] = []
    lines.forEach(line => {
      const from = solvedPositions.get(line.from)
      const to = solvedPositions.get(line.to)
      if (!from || !to) {
        logger.error("render line vertex missing", { lineId: line.id })
        throw errors.new("render: vertex missing")
      }
      if (line.isRay) {
        // Extend ray to canvas bounds deterministically
        const dirX = to.x - from.x
        const dirY = to.y - from.y
        const len = Math.hypot(dirX, dirY)
        if (len === 0) {
          logger.error("render ray zero length", { lineId: line.id })
          throw errors.new("render: zero length ray")
        }
        const ux = dirX / len
        const uy = dirY / len
        // Project to a far point beyond canvas diagonal
        const diag = Math.hypot(width, height)
        const farX = from.x + ux * diag * 2
        const farY = from.y + uy * diag * 2
        canvas.drawLine(from.x, from.y, farX, farY, { stroke: theme.colors.axis, strokeWidth: theme.stroke.width.thick, dash: line.style === "dashed" ? "5 3" : undefined })
        screenLines.push({ a: from, b: { x: farX, y: farY }, id: line.id })
      } else {
        canvas.drawLine(from.x, from.y, to.x, to.y, { stroke: theme.colors.axis, strokeWidth: theme.stroke.width.thick, dash: line.style === "dashed" ? "5 3" : undefined })
        screenLines.push({ a: from, b: to, id: line.id })
      }
    })

    constraints.filter((c): c is Extract<ConstraintDef, {type: 'angle'}> => c.type === 'angle').forEach(angle => {
      const viz = angle.visualization
      if (viz.type === "none") return
      const vertexPos = solvedPositions.get(angle.vertex)
      const line1 = lines.find(l => l.id === angle.line1)
      const line2 = lines.find(l => l.id === angle.line2)
      if (!vertexPos || !line1 || !line2) return
      const p1Id = line1.from === angle.vertex ? line1.to : line1.from
      const p2Id = line2.from === angle.vertex ? line2.to : line2.from
      const p1 = solvedPositions.get(p1Id)
      const p2 = solvedPositions.get(p2Id)
      if (!p1 || !p2) return

      if (viz.type === "right") {
        const v1x = p1.x - vertexPos.x
        const v1y = p1.y - vertexPos.y
        const m1 = Math.hypot(v1x, v1y)
        const u1x = v1x / m1
        const u1y = v1y / m1
        const v2x = p2.x - vertexPos.x
        const v2y = p2.y - vertexPos.y
        const m2 = Math.hypot(v2x, v2y)
        const u2x = v2x / m2
        const u2y = v2y / m2
        const size = 15
        const m1x = vertexPos.x + u1x * size
        const m1y = vertexPos.y + u1y * size
        const m2x = vertexPos.x + u2x * size
        const m2y = vertexPos.y + u2y * size
        const m3x = vertexPos.x + (u1x + u2x) * size
        const m3y = vertexPos.y + (u1y + u2y) * size
        const path = new Path2D().moveTo(m1x, m1y).lineTo(m3x, m3y).lineTo(m2x, m2y)
        canvas.drawPath(path, { fill: "none", stroke: viz.color, strokeWidth: theme.stroke.width.thick })
      }

      if (viz.type === "arc") {
        const startAngle = Math.atan2(p1.y - vertexPos.y, p1.x - vertexPos.x)
        const endAngle = Math.atan2(p2.y - vertexPos.y, p2.x - vertexPos.x)
        const radius = viz.radius ?? 25
        const arcStartX = vertexPos.x + radius * Math.cos(startAngle)
        const arcStartY = vertexPos.y + radius * Math.sin(startAngle)
        const arcEndX = vertexPos.x + radius * Math.cos(endAngle)
        const arcEndY = vertexPos.y + radius * Math.sin(endAngle)
        const path = new Path2D().moveTo(arcStartX, arcStartY).arcTo(radius, radius, 0, viz.largeArcFlag, viz.sweepFlag, arcEndX, arcEndY)
        canvas.drawPath(path, { fill: "none", stroke: viz.color, strokeWidth: theme.stroke.width.xthick })
      }

      if (viz.label !== null && viz.label !== undefined) {
        let startAngle = Math.atan2(p1.y - vertexPos.y, p1.x - vertexPos.x)
        let endAngle = Math.atan2(p2.y - vertexPos.y, p2.x - vertexPos.x)
        let angleDiff = endAngle - startAngle
        while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI
        while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI
        if (Math.abs(angleDiff) > Math.PI) angleDiff = angleDiff > 0 ? angleDiff - 2 * Math.PI : angleDiff + 2 * Math.PI
        const angleSize = Math.abs(angleDiff)
        const midAngle = startAngle + angleDiff / 2
        let labelRadius: number
        if (viz.type === "right") {
          labelRadius = 25
        } else {
          const ARC_OFFSET = 6
          const FONT_SIZE_ESTIMATE = 14
          const MIN_LABEL_CLEARANCE = FONT_SIZE_ESTIMATE * 1.5
          const baseLabelRadius = (viz.radius ?? 25) + ARC_OFFSET + MIN_LABEL_CLEARANCE
          const CLEARANCE_PX = FONT_SIZE_ESTIMATE * 0.7
          if (Math.sin(angleSize / 2) > 0.01) {
            const minRadiusForClearance = CLEARANCE_PX / Math.sin(angleSize / 2)
            labelRadius = Math.max(baseLabelRadius, minRadiusForClearance)
          } else {
            labelRadius = baseLabelRadius
          }
          const isLongLabel = viz.label ? viz.label.length > 3 : false
          if (isLongLabel) {
            const extraSpacing = viz.label && viz.label.length > 4 ? (viz.label.length - 4) * 4 : 0
            labelRadius += 18 + extraSpacing
          }
        }
        const labelX = vertexPos.x + labelRadius * Math.cos(midAngle)
        const labelY = vertexPos.y + labelRadius * Math.sin(midAngle)
        canvas.drawText({
          x: labelX,
          y: labelY,
          text: viz.label ?? "",
          fill: theme.colors.text,
          stroke: theme.colors.white,
          strokeWidth: 0.3,
          paintOrder: "stroke fill",
          anchor: "middle",
          dominantBaseline: "middle",
          fontPx: theme.font.size.medium,
          fontWeight: "500"
        })
      }
    })

    for (const [id, pos] of solvedPositions.entries()) {
      const vertexDef = allVertices.get(id)
      canvas.drawCircle(pos.x, pos.y, theme.geometry.pointRadius.base, { fill: theme.colors.black })
      if (vertexDef && vertexDef.label) {
        const connectedRays = lines.filter(l => l.from === id || l.to === id)
        const angles: number[] = []
        for (const l of connectedRays) {
          const otherId = l.from === id ? l.to : l.from
          const other = solvedPositions.get(otherId)
          if (!other) continue
          angles.push(Math.atan2(other.y - pos.y, other.x - pos.x))
        }
        angles.sort((a, b) => a - b)
        let bestAngle = Math.PI / 4
        if (angles.length > 0) {
          let maxGap = 0
          for (let i = 0; i < angles.length; i++) {
            const a1 = angles[i]!
            const a2 = angles[(i + 1) % angles.length]!
            let gap = a2 - a1
            if (gap < 0) gap += 2 * Math.PI
            if (i === angles.length - 1) gap = (angles[0]! + 2 * Math.PI) - a1
            if (gap > maxGap) {
              maxGap = gap
              bestAngle = a1 + gap / 2
            }
          }
        }
        const labelDist = 15
        const textX = pos.x + labelDist * Math.cos(bestAngle)
        const textY = pos.y + labelDist * Math.sin(bestAngle)
        canvas.drawText({ x: textX, y: textY, text: vertexDef.label, fill: theme.colors.text, fontPx: theme.font.size.large, fontWeight: theme.font.weight.bold })
      }
    }

    if (props.regionLabels) {
      const allLinesForCollision = [...screenLines]
      const placeLabel = (text: string, startPos: Point) => {
        const fontPx = theme.font.size.medium
        const textMetrics = { width: text.length * fontPx * 0.6, height: fontPx }
        let bestPos = startPos
        let minCollisions = Number.POSITIVE_INFINITY
        for (let i = 0; i < 8; i++) {
          const angle = i * Math.PI / 4
          for (let dist = 0; dist <= 40; dist += 5) {
            const testPos = { x: startPos.x + dist * Math.cos(angle), y: startPos.y + dist * Math.sin(angle) }
            const rect = { x: testPos.x - textMetrics.width / 2, y: testPos.y - textMetrics.height / 2, width: textMetrics.width, height: textMetrics.height }
            const collisions = allLinesForCollision.filter(l => segmentIntersectsRect(l.a, l.b, rect)).length
            if (collisions < minCollisions) {
              minCollisions = collisions
              bestPos = testPos
            }
            if (minCollisions === 0) break
          }
          if (minCollisions === 0) break
        }
        canvas.drawText({ x: bestPos.x, y: bestPos.y, text, fill: theme.colors.text, anchor: "middle", dominantBaseline: "middle", fontPx, stroke: theme.colors.white, strokeWidth: 4, paintOrder: "stroke fill" })
      }
      props.regionLabels.forEach((label) => {
        if (label.placement.type === "centroid") {
          const points = label.placement.vertices.map(vid => solvedPositions.get(vid)).filter((p): p is Point => !!p)
          if (points.length > 0) {
            const centroid = { x: points.reduce((s, p) => s + p.x, 0) / points.length, y: points.reduce((s, p) => s + p.y, 0) / points.length }
            placeLabel(label.text, centroid)
          }
        } else if (label.placement.type === "alongLine") {
          const lineId: string = label.placement.line
          const line = lines.find(l => l.id === lineId)
          if (!line) return
          const a = solvedPositions.get(line.from)
          const b = solvedPositions.get(line.to)
          if (!a || !b) return
          const t = label.placement.offset
          const pos = { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t }
          placeLabel(label.text, pos)
        }
      })
    }

    const { svgBody, vbMinX, vbMinY, width: finalWidth, height: finalHeight } = canvas.finalize(PADDING)
    return `<svg width="${finalWidth}" height="${finalHeight}" viewBox="${vbMinX} ${vbMinY} ${finalWidth} ${finalHeight}" xmlns="http://www.w3.org/2000/svg" font-family="${theme.font.family.sans}" font-size="${theme.font.size.base}">${svgBody}</svg>`
}
