import type { ExportOptions, FishbonePreset } from '../types'

export type FlowchartPreset = FishbonePreset
export type FlowchartNodeType = 'activity' | 'decision' | 'start' | 'end'
export type FlowchartPort = 'auto' | 'top' | 'right' | 'bottom' | 'left'
export interface FlowchartShapeStyle {
  fill: string
  stroke: string
  textColor: string
  fontFamily: string
  fontSize: number
  fontWeight: number
  lineWidth: number
  radius: number
}
export interface FlowchartRegionStyle {
  fill: string
  stroke: string
  titleColor: string
  textColor: string
}
export interface FlowchartEdgeStyle {
  stroke: string
  textColor: string
  lineWidth: number
  dashed: boolean
  arrow: boolean
}
export interface FlowchartNode {
  id: string
  label: string
  type: FlowchartNodeType
  /** Only activity/decision nodes belong to regions; terminals are global. */
  regionId?: string
  shape?: 'rectangle' | 'ellipse'
  /** Initial ordering preference; connections may refine row alignment. */
  order?: number
  style?: Partial<FlowchartShapeStyle>
}
export interface FlowchartRegion {
  id: string
  label: string
  description?: string
  style?: Partial<FlowchartRegionStyle>
}
export interface FlowchartEdge {
  id?: string
  source: string
  target: string
  label?: string
  sourcePort?: FlowchartPort
  targetPort?: FlowchartPort
  style?: Partial<FlowchartEdgeStyle>
}
export interface FlowchartData {
  version: 1
  title?: string
  nodes: FlowchartNode[]
  regions?: FlowchartRegion[]
  edges: FlowchartEdge[]
}
export interface FlowchartTheme {
  background: string
  fontFamily: string
  fontSize: number
  activity: FlowchartShapeStyle
  decision: FlowchartShapeStyle
  start: FlowchartShapeStyle
  end: FlowchartShapeStyle
  region: FlowchartRegionStyle
  edge: FlowchartEdgeStyle
}
export type FlowchartThemeOverrides = Partial<
  Omit<FlowchartTheme, FlowchartNodeType | 'region' | 'edge'>
> & {
  activity?: Partial<FlowchartShapeStyle>
  decision?: Partial<FlowchartShapeStyle>
  start?: Partial<FlowchartShapeStyle>
  end?: Partial<FlowchartShapeStyle>
  region?: Partial<FlowchartRegionStyle>
  edge?: Partial<FlowchartEdgeStyle>
}
export interface FlowchartLayoutOptions {
  /** Visual heading only; the accessible title is retained. */
  showTitle: boolean
  maxNodesPerColumn: number
  nodeWidth: number
  maxNodeWidth: number
  maxNodeHeight: number
  columnGap: number
  rowGap: number
  regionGap: number
  padding: number
  optimizeAlignment: boolean
  /** Split dense regions using the typical population of neighboring regions. */
  balanceRegions: boolean
  /** aligned: top/bottom on one axis; left: shared left axis; auto: normal grid cells. */
  terminalPlacement: 'aligned' | 'left' | 'auto'
}
export interface FlowchartHandle {
  getSvg: () => string
  exportImage: (options?: ExportOptions) => Promise<Blob>
  download: (options?: ExportOptions) => Promise<void>
}
export interface FlowchartPoint {
  x: number
  y: number
}
export interface FlowchartBox {
  x: number
  y: number
  width: number
  height: number
}
export interface FlowchartPlacedNode extends FlowchartBox {
  node: FlowchartNode
  style: FlowchartShapeStyle
  lines: string[]
  row: number
  column: number
}
export interface FlowchartPlacedRegion extends FlowchartBox {
  region: FlowchartRegion
  style: FlowchartRegionStyle
  titleLines: string[]
  descriptionLines: string[]
  headerHeight: number
  columns: number
}
export interface FlowchartPlacedEdge {
  edge: FlowchartEdge
  points: FlowchartPoint[]
  style: FlowchartEdgeStyle
  label?: FlowchartBox & { lines: string[] }
}
export interface FlowchartLayout {
  width: number
  height: number
  nodes: FlowchartPlacedNode[]
  regions: FlowchartPlacedRegion[]
  edges: FlowchartPlacedEdge[]
  theme: FlowchartTheme
  options: FlowchartLayoutOptions
}
