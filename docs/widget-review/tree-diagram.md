### tree-diagram — Manual Widget Review

Principles: require `width`/`height`; minimize nullables; no `.default()`; avoid array min.

Scope
- Purpose: explicit-positioned nodes and edges for factor/probability trees

Current pain points
- Nullable style/color, size fallbacks; `.min(1)` on nodes.

Proposed API (no feature loss, fewer nullables)
- Require `width`, `height`.
- Require `style`, `color`, `nodeFontSize`, `nodeRadius` explicitly.
- Remove array `.min()`; validate node existence in generator.

Schema sketch
```ts
const Node = z.object({ 
  id: z.string().describe("Unique identifier for this node (e.g., 'root', 'n1', 'left-child', 'outcome-A'). Used to reference in edges. Must be unique within diagram."), 
  label: z.string().describe("Text content displayed in the node (e.g., '24', '2 × 12', 'H', '0.5', 'Yes'). Keep concise to fit within node circle."), 
  position: z.object({ 
    x: z.number().describe("Horizontal position of node center in pixels (e.g., 200, 100, 350). Origin (0,0) is top-left of diagram."), 
    y: z.number().describe("Vertical position of node center in pixels (e.g., 50, 150, 200). Increases downward. Tree typically grows downward.") 
  }).strict().describe("Exact position for the node center. No automatic layout - positions must be explicitly calculated."), 
  style: z.enum(['circled','default']).describe("Visual style of the node. 'circled' draws a circle around the label. 'default' also shows a circle (legacy compatibility)."), 
  color: z.string().describe("CSS color for the node's text and circle outline (e.g., 'black', '#0066CC', 'darkgreen'). Should contrast with white background.") 
}).strict()

const Edge = z.object({ 
  from: z.string().describe("ID of the parent/source node where this edge starts. Must match a node.id in the nodes array (e.g., 'root', 'n1')."), 
  to: z.string().describe("ID of the child/target node where this edge ends. Must match a node.id in the nodes array (e.g., 'n2', 'left-child')."), 
  style: z.enum(['solid','dashed']).describe("Visual style of the connecting line. 'solid' for regular edges, 'dashed' for special relationships or probability branches.") 
}).strict()

export const TreeDiagramPropsSchema = z.object({
  type: z.literal('treeDiagram').describe("Identifies this as a tree diagram widget for hierarchical structures and decision trees."),
  width: z.number().positive().describe("Total width of the diagram in pixels (e.g., 400, 600, 500). Must accommodate all node positions and labels."),
  height: z.number().positive().describe("Total height of the diagram in pixels (e.g., 300, 400, 500). Trees typically need more height than width."),
  nodes: z.array(Node).describe("All nodes in the tree with explicit positions. No automatic layout - each node's position must be calculated. Can be empty for blank diagram."),
  edges: z.array(Edge).describe("Connections between nodes defining parent-child relationships. Each edge references nodes by their IDs. Can be empty for disconnected nodes."),
  nodeFontSize: z.number().positive().describe("Font size for node labels in pixels (e.g., 14, 16, 12). Should be readable but fit within nodeRadius."),
  nodeRadius: z.number().positive().describe("Radius of the circle for 'circled' style nodes in pixels (e.g., 20, 25, 30). Larger values accommodate longer labels."),
}).strict().describe("Creates tree diagrams with manually positioned nodes and edges. Perfect for factor trees, probability trees, decision trees, and hierarchical structures. Unlike automatic layout systems, this gives complete control over node positioning for educational clarity. All nodes are rendered with circles for consistency.")```

Why this helps
- Removes defaulted styling and size fallbacks; explicit inputs improve AI reliability.


