import { make_gcs_wrapper } from '@salusoft89/planegcs';
import fs from 'node:fs';

async function buildComplexConstruction() {
  const gcs = await make_gcs_wrapper();

  // step 1: create the horizontal baseline [A][B] with points
  const primitives = [
    // baseline points (left to right) - fix A and B to establish scale and orientation
    { id: 'A', type: 'point' as const, x: -300, y: 0, fixed: true },
    { id: 'B', type: 'point' as const, x: 300, y: 0, fixed: true },
    
    // intermediate points on baseline (approximate x-coordinates, will be constrained)
    { id: 'P', type: 'point' as const, x: -200, y: 0, fixed: false },
    { id: 'S', type: 'point' as const, x: -120, y: 0, fixed: false },
    { id: 'M', type: 'point' as const, x: -60, y: 0, fixed: false },
    { id: 'D', type: 'point' as const, x: -20, y: 0, fixed: false },
    { id: 'C', type: 'point' as const, x: 20, y: 0, fixed: false },
    { id: 'N', type: 'point' as const, x: 80, y: 0, fixed: false },
    { id: 'Q', type: 'point' as const, x: 200, y: 0, fixed: false },

    // baseline line segments
    { id: 'baseline_AB', type: 'line' as const, p1_id: 'A', p2_id: 'B' },

    // constrain all intermediate points to lie on the baseline
    { id: 'P_on_baseline', type: 'p2l_distance' as const, p_id: 'P', l_id: 'baseline_AB', distance: 0 },
    { id: 'S_on_baseline', type: 'p2l_distance' as const, p_id: 'S', l_id: 'baseline_AB', distance: 0 },
    { id: 'M_on_baseline', type: 'p2l_distance' as const, p_id: 'M', l_id: 'baseline_AB', distance: 0 },
    { id: 'D_on_baseline', type: 'p2l_distance' as const, p_id: 'D', l_id: 'baseline_AB', distance: 0 },
    { id: 'C_on_baseline', type: 'p2l_distance' as const, p_id: 'C', l_id: 'baseline_AB', distance: 0 },
    { id: 'N_on_baseline', type: 'p2l_distance' as const, p_id: 'N', l_id: 'baseline_AB', distance: 0 },
    { id: 'Q_on_baseline', type: 'p2l_distance' as const, p_id: 'Q', l_id: 'baseline_AB', distance: 0 },

    // step 2: add vertical line endpoints (corrected naming and directions)
    { id: 'A_top', type: 'point' as const, x: -60, y: 200, fixed: false }, // was M_top, now A_top
    { id: 'D_bracket', type: 'point' as const, x: -20, y: 150, fixed: false }, // was D_top, now D_bracket, extends upward
    { id: 'B_top', type: 'point' as const, x: 80, y: 180, fixed: false }, // was N_top, now B_top

    // step 3: add points E, C, F to the vertical line [C]->[D] (from top to bottom)
    { id: 'E', type: 'point' as const, x: 20, y: 120, fixed: false }, // point E on [C]->[D] line (top)
    { id: 'C_vertical', type: 'point' as const, x: 20, y: 80, fixed: false }, // point C on [C]->[D] line (middle)
    { id: 'F', type: 'point' as const, x: 20, y: 40, fixed: false }, // point F on [C]->[D] line (bottom)

    // vertical lines
    { id: 'line_MA', type: 'line' as const, p1_id: 'M', p2_id: 'A_top' },
    { id: 'line_CD', type: 'line' as const, p1_id: 'C', p2_id: 'D_bracket' }, // now extends upward
    { id: 'line_BN', type: 'line' as const, p1_id: 'N', p2_id: 'B_top' },

    // ensure vertical lines are actually vertical (perpendicular to baseline)
    { id: 'MA_vertical', type: 'perpendicular_ll' as const, l1_id: 'line_MA', l2_id: 'baseline_AB' },
    { id: 'CD_vertical', type: 'perpendicular_ll' as const, l1_id: 'line_CD', l2_id: 'baseline_AB' },
    { id: 'BN_vertical', type: 'perpendicular_ll' as const, l1_id: 'line_BN', l2_id: 'baseline_AB' },

    // constrain D to be on the CD line (since we used D_bracket for the line endpoint)
    { id: 'D_on_CD_line', type: 'p2l_distance' as const, p_id: 'D', l_id: 'line_CD', distance: 0 },

    // constrain E, C_vertical, and F to be on the [C]->[D] line
    { id: 'E_on_CD_line', type: 'p2l_distance' as const, p_id: 'E', l_id: 'line_CD', distance: 0 },
    { id: 'C_vertical_on_CD_line', type: 'p2l_distance' as const, p_id: 'C_vertical', l_id: 'line_CD', distance: 0 },
    { id: 'F_on_CD_line', type: 'p2l_distance' as const, p_id: 'F', l_id: 'line_CD', distance: 0 },

    // step 4: add diagonal lines A->E, A->B (single straight line), F->B, A->P, and B->Q
    { id: 'line_AE', type: 'line' as const, p1_id: 'A_top', p2_id: 'E' },
    { id: 'line_AB', type: 'line' as const, p1_id: 'A_top', p2_id: 'B_top' },
    { id: 'line_FB', type: 'line' as const, p1_id: 'F', p2_id: 'B_top' },
    { id: 'line_AP', type: 'line' as const, p1_id: 'A_top', p2_id: 'P' },
    { id: 'line_BQ', type: 'line' as const, p1_id: 'B_top', p2_id: 'Q' },

    // constrain C_vertical to be on line A->B (so A, C, B are collinear)
    { id: 'C_on_line_AB', type: 'p2l_distance' as const, p_id: 'C_vertical', l_id: 'line_AB', distance: 0 },
    
    // Note: C_vertical position on the vertical line will be determined by the line A->B intersection
    // The equidistant constraint from E and F can be added later if needed

    // step 5: add semicircle [A]~>[B] centered at point S with points [A] and [B] on the arc
    // create the semicircle centered at point S (baseline point S)
    { id: 'semicircle', type: 'circle' as const, c_id: 'S', radius: 300 }, // initial radius, will be constrained
    
    // constrain [A] and [B] to be on the semicircle [A]~>[B]
    { id: 'A_on_main_semicircle', type: 'point_on_circle' as const, p_id: 'A', c_id: 'semicircle' },
    { id: 'B_on_main_semicircle', type: 'point_on_circle' as const, p_id: 'B', c_id: 'semicircle' },
    
    // add points T, U on the semicircle arc (D_bracket is already defined and will be constrained to semicircle)
    { id: 'T', type: 'point' as const, x: -200, y: 220, fixed: false },
    { id: 'U', type: 'point' as const, x: 200, y: 220, fixed: false },
    
    // constrain T, D_bracket, U to be on the semicircle (D_bracket is the [D] point from the vertical line)
    { id: 'T_on_semicircle', type: 'point_on_circle' as const, p_id: 'T', c_id: 'semicircle' },
    { id: 'D_bracket_on_semicircle', type: 'point_on_circle' as const, p_id: 'D_bracket', c_id: 'semicircle' },
    { id: 'U_on_semicircle', type: 'point_on_circle' as const, p_id: 'U', c_id: 'semicircle' },

    // step 6: add semicircles [A]~>[C] and [C]~>[B]
    // semicircle [A]~>[C] centered at point P
    { id: 'semicircle_AC', type: 'circle' as const, c_id: 'P', radius: 100 }, // initial radius, will be constrained
    
    // semicircle [C]~>[B] centered at point Q  
    { id: 'semicircle_CB', type: 'circle' as const, c_id: 'Q', radius: 100 }, // initial radius, will be constrained
    
    // constrain [A] to be on semicircle [A]~>[C]
    { id: 'A_on_semicircle_AC', type: 'point_on_circle' as const, p_id: 'A', c_id: 'semicircle_AC' },
    
    // constrain C (baseline point) to be on semicircle [A]~>[C] 
    { id: 'C_baseline_on_semicircle_AC', type: 'point_on_circle' as const, p_id: 'C', c_id: 'semicircle_AC' },
    
    // constrain C (baseline point) to be on semicircle [C]~>[B]
    { id: 'C_baseline_on_semicircle_CB', type: 'point_on_circle' as const, p_id: 'C', c_id: 'semicircle_CB' },
    
    // constrain [B] to be on semicircle [C]~>[B]
    { id: 'B_on_semicircle_CB', type: 'point_on_circle' as const, p_id: 'B', c_id: 'semicircle_CB' },

    // step 7: add circle A* centered at point A (upper A, not baseline A)
    { id: 'circle_A_star', type: 'circle' as const, c_id: 'A_top', radius: 50 }, // initial radius, will be constrained
    
    // constrain points T and E to be on circle A*
    { id: 'T_on_circle_A_star', type: 'point_on_circle' as const, p_id: 'T', c_id: 'circle_A_star' },
    { id: 'E_on_circle_A_star', type: 'point_on_circle' as const, p_id: 'E', c_id: 'circle_A_star' },
    
    // constrain circle A* to be tangent to the main semicircle [A]~>[B]
    { id: 'A_star_tangent_to_main', type: 'tangent_cc' as const, c1_id: 'circle_A_star', c2_id: 'semicircle' },
    
    // constrain circle A* to be tangent to semicircle [A]~>[C]
    { id: 'A_star_tangent_to_AC', type: 'tangent_cc' as const, c1_id: 'circle_A_star', c2_id: 'semicircle_AC' },
    
    // constrain circle A* to be tangent to line [D]->[C]
    { id: 'A_star_tangent_to_line_CD', type: 'c2ldistance' as const, c_id: 'circle_A_star', l_id: 'line_CD', dist: 0 },

    // step 8: add circle B* centered at point B (upper B, not baseline B)
    { id: 'circle_B_star', type: 'circle' as const, c_id: 'B_top', radius: 50 }, // initial radius, will be constrained
    
    // constrain points U and F to be on circle B*
    { id: 'U_on_circle_B_star', type: 'point_on_circle' as const, p_id: 'U', c_id: 'circle_B_star' },
    { id: 'F_on_circle_B_star', type: 'point_on_circle' as const, p_id: 'F', c_id: 'circle_B_star' },
    
    // constrain circle B* to be tangent to the main semicircle [A]~>[B]
    { id: 'B_star_tangent_to_main', type: 'tangent_cc' as const, c1_id: 'circle_B_star', c2_id: 'semicircle' },
    
    // constrain circle B* to be tangent to semicircle [C]~>[B]
    { id: 'B_star_tangent_to_CB', type: 'tangent_cc' as const, c1_id: 'circle_B_star', c2_id: 'semicircle_CB' },
    
    // constrain circle B* to be tangent to line [D]->[C]
    { id: 'B_star_tangent_to_line_CD', type: 'c2ldistance' as const, c_id: 'circle_B_star', l_id: 'line_CD', dist: 0 },

    // step 9: add dotted lines S->A, A->T, S->B, and B->U
    { id: 'line_SA', type: 'line' as const, p1_id: 'S', p2_id: 'A_top' },
    { id: 'line_AT', type: 'line' as const, p1_id: 'A_top', p2_id: 'T' },
    { id: 'line_SB', type: 'line' as const, p1_id: 'S', p2_id: 'B_top' },
    { id: 'line_BU', type: 'line' as const, p1_id: 'B_top', p2_id: 'U' },

    // step 3: add some positioning constraints to establish relative spacing
    // (these are approximate - we'll refine based on the actual construction requirements)
    // Note: S position is now determined by semicircle geometry ([A] and [B] on circle centered at S)
    
    // step 10: constrain point [C] to be at 2/3 distance from [A] to [B] (1/3 from [B])
    // [A] is at x=-300, [B] is at x=300, so [C] should be at x = -300 + (2/3)(600) = -300 + 400 = 100
    { id: 'C_at_two_thirds', type: 'equal' as const, param1: { o_id: 'C', prop: 'x' as const }, param2: 100 },
  ];

  console.log('building complex construction with straight line A->B and C constraints, using', primitives.length, 'primitives');
  
  gcs.push_primitives_and_params(primitives);
  
  const status = gcs.solve();
  console.log('solve status:', status);
  
  if (status !== 0) {
    console.log('conflicts:', gcs.get_gcs_conflicting_constraints());
    console.log('redundant:', gcs.get_gcs_redundant_constraints());
    gcs.destroy_gcs_module();
    return;
  }
  
  gcs.apply_solution();
  
  // collect points for svg export
  const pointIds = ['A', 'P', 'S', 'M', 'D', 'C', 'N', 'Q', 'B', 'A_top', 'D_bracket', 'B_top', 'E', 'C_vertical', 'F', 'T', 'U'];
  const points = pointIds.map(id => ({
    ...gcs.sketch_index.get_sketch_point(id)
  }));
  
  // compute bounds
  const xs = points.map(p => p.x);
  const ys = points.map(p => p.y);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...ys), maxY = Math.max(...ys);
  
  const margin = 50;
  const width = maxX - minX + margin * 2;
  const height = maxY - minY + margin * 2;
  
  const toSvg = (p: { x: number; y: number }) => ({
    x: (p.x - minX) + margin,
    y: (maxY - p.y) + margin,
  });
  
  let svg = `<?xml version="1.0" encoding="UTF-8"?>\n`;
  svg += `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">\n`;
  svg += `<style><![CDATA[
    .bg { fill: #f8f9fa; }
    .baseline { stroke: #2c3e50; stroke-width: 3; }
    .vertical { stroke: #3498db; stroke-width: 2; }
    .diagonal { stroke: #e74c3c; stroke-width: 1.5; }
    .dotted { stroke: #8e44ad; stroke-width: 1; stroke-dasharray: 3,3; }
    .semicircle { fill: none; stroke: #9b59b6; stroke-width: 2; }
    .inner-semicircle { fill: none; stroke: #e67e22; stroke-width: 1.5; }
    .circle { fill: none; stroke: #27ae60; stroke-width: 1.5; }
    .point { fill: #e74c3c; }
    .label { font: 12px/1.2 sans-serif; fill: #2c3e50; }
  ]]></style>\n`;
  svg += `<rect class="bg" x="0" y="0" width="${width}" height="${height}"/>\n`;
  
  // draw baseline
  const A_svg = toSvg(points.find(p => p.id === 'A')!);
  const B_svg = toSvg(points.find(p => p.id === 'B')!);
  svg += `<line class="baseline" x1="${A_svg.x}" y1="${A_svg.y}" x2="${B_svg.x}" y2="${B_svg.y}"/>\n`;
  
  // draw vertical lines
  const M_svg = toSvg(points.find(p => p.id === 'M')!);
  const A_top_svg = toSvg(points.find(p => p.id === 'A_top')!);
  svg += `<line class="vertical" x1="${M_svg.x}" y1="${M_svg.y}" x2="${A_top_svg.x}" y2="${A_top_svg.y}"/>\n`;
  
  const C_svg = toSvg(points.find(p => p.id === 'C')!);
  const D_bracket_svg = toSvg(points.find(p => p.id === 'D_bracket')!);
  svg += `<line class="vertical" x1="${C_svg.x}" y1="${C_svg.y}" x2="${D_bracket_svg.x}" y2="${D_bracket_svg.y}"/>\n`;
  
  const N_svg = toSvg(points.find(p => p.id === 'N')!);
  const B_top_svg = toSvg(points.find(p => p.id === 'B_top')!);
  svg += `<line class="vertical" x1="${N_svg.x}" y1="${N_svg.y}" x2="${B_top_svg.x}" y2="${B_top_svg.y}"/>\n`;
  
  // draw diagonal lines A->E, A->C, C->B, F->B, A->P, B->Q
  const E_svg = toSvg(points.find(p => p.id === 'E')!);
  const C_vertical_svg = toSvg(points.find(p => p.id === 'C_vertical')!);
  const F_svg = toSvg(points.find(p => p.id === 'F')!);
  const P_svg = toSvg(points.find(p => p.id === 'P')!);
  const Q_svg = toSvg(points.find(p => p.id === 'Q')!);
  
  svg += `<line class="diagonal" x1="${A_top_svg.x}" y1="${A_top_svg.y}" x2="${E_svg.x}" y2="${E_svg.y}"/>\n`; // A->E
  svg += `<line class="diagonal" x1="${A_top_svg.x}" y1="${A_top_svg.y}" x2="${B_top_svg.x}" y2="${B_top_svg.y}"/>\n`; // A->B (single straight line)
  svg += `<line class="diagonal" x1="${F_svg.x}" y1="${F_svg.y}" x2="${B_top_svg.x}" y2="${B_top_svg.y}"/>\n`; // F->B
  svg += `<line class="diagonal" x1="${A_top_svg.x}" y1="${A_top_svg.y}" x2="${P_svg.x}" y2="${P_svg.y}"/>\n`; // A->P
  svg += `<line class="diagonal" x1="${B_top_svg.x}" y1="${B_top_svg.y}" x2="${Q_svg.x}" y2="${Q_svg.y}"/>\n`; // B->Q
  
  // draw dotted lines S->A, A->T, S->B, B->U
  const S_svg = toSvg(points.find(p => p.id === 'S')!);
  const T_svg = toSvg(points.find(p => p.id === 'T')!);
  const U_svg = toSvg(points.find(p => p.id === 'U')!);
  
  svg += `<line class="dotted" x1="${S_svg.x}" y1="${S_svg.y}" x2="${A_top_svg.x}" y2="${A_top_svg.y}"/>\n`; // S->A
  svg += `<line class="dotted" x1="${A_top_svg.x}" y1="${A_top_svg.y}" x2="${T_svg.x}" y2="${T_svg.y}"/>\n`; // A->T
  svg += `<line class="dotted" x1="${S_svg.x}" y1="${S_svg.y}" x2="${B_top_svg.x}" y2="${B_top_svg.y}"/>\n`; // S->B
  svg += `<line class="dotted" x1="${B_top_svg.x}" y1="${B_top_svg.y}" x2="${U_svg.x}" y2="${U_svg.y}"/>\n`; // B->U
  
  // draw semicircles as arcs (upper half only, clipped at baseline)
  const semicircle = gcs.sketch_index.get_sketch_circle('semicircle');
  const semicircle_AC = gcs.sketch_index.get_sketch_circle('semicircle_AC');
  const semicircle_CB = gcs.sketch_index.get_sketch_circle('semicircle_CB');
  
  // helper function to create semicircle arc path (upper half)
  function createSemicirclePath(cx: number, cy: number, r: number) {
    const leftX = cx - r;
    const rightX = cx + r;
    return `M ${leftX} ${cy} A ${r} ${r} 0 0 1 ${rightX} ${cy}`;
  }
  
  // draw main semicircle [A]~>[B] (centered at S)
  svg += `<path class="semicircle" d="${createSemicirclePath(S_svg.x, S_svg.y, semicircle.radius)}"/>\n`;
  
  // draw inner semicircle [A]~>[C] (centered at P)
  svg += `<path class="inner-semicircle" d="${createSemicirclePath(P_svg.x, P_svg.y, semicircle_AC.radius)}"/>\n`;
  
  // draw inner semicircle [C]~>[B] (centered at Q)
  svg += `<path class="inner-semicircle" d="${createSemicirclePath(Q_svg.x, Q_svg.y, semicircle_CB.radius)}"/>\n`;
  
  // draw circle A*
  const circle_A_star = gcs.sketch_index.get_sketch_circle('circle_A_star');
  svg += `<circle class="circle" cx="${A_top_svg.x}" cy="${A_top_svg.y}" r="${circle_A_star.radius}"/>\n`;
  
  // draw circle B*
  const circle_B_star = gcs.sketch_index.get_sketch_circle('circle_B_star');
  svg += `<circle class="circle" cx="${B_top_svg.x}" cy="${B_top_svg.y}" r="${circle_B_star.radius}"/>\n`;
  
  // draw points and labels (with corrected display names)
  points.forEach(p => {
    const svg_p = toSvg(p);
    svg += `<circle class="point" cx="${svg_p.x}" cy="${svg_p.y}" r="3"/>\n`;
    
    // map internal ids to display labels matching the original image
    let displayLabel = p.id;
    if (p.id === 'A_top') displayLabel = 'A';
    else if (p.id === 'D_bracket') displayLabel = '[D]';
    else if (p.id === 'B_top') displayLabel = 'B';
    else if (p.id === 'A') displayLabel = '[A]'; // baseline A becomes [A]
    else if (p.id === 'B') displayLabel = '[B]'; // baseline B becomes [B]
    else if (p.id === 'C_vertical') displayLabel = 'C'; // vertical line point C
    // T, U, E and F keep their names as-is
    
    svg += `<text class="label" x="${svg_p.x + 6}" y="${svg_p.y - 6}">${displayLabel}</text>\n`;
  });
  
  svg += `</svg>\n`;
  
  fs.writeFileSync('./planegcs-complex-construction.svg', svg, 'utf8');
  console.log('wrote planegcs-complex-construction.svg');
  
  gcs.destroy_gcs_module();
}

buildComplexConstruction().catch(console.error);
