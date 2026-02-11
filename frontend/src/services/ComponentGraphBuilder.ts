/**
 * Component Graph Builder
 * Builds and renders the hierarchical UVM component diagram
 */

import {
  TestbenchSpecification,
  ComponentGraph,
  ComponentNode,
  ComponentEdge,
  UVMComponentSpec,
  TransactionData,
  SpecificationChanges,
} from "../types/simulation";

/**
 * ComponentGraphBuilder class
 * Responsible for building component graphs from specifications
 */
export class ComponentGraphBuilder {
  private graph: ComponentGraph | null = null;
  private highlightedComponentId: string | null = null;
  private activeTransactions: Map<string, TransactionAnimation> = new Map();

  /**
   * Build component graph from specification
   */
  buildGraph(spec: TestbenchSpecification): ComponentGraph {
    const nodes = this.buildNodes(spec.components);
    const edges = this.buildEdges(nodes);

    this.graph = {
      nodes,
      edges,
      layout: {
        type: "hierarchical",
        direction: "top-down",
        spacing: {
          horizontal: 200,
          vertical: 150,
        },
      },
    };

    return this.graph;
  }

  /**
   * Update graph when specification changes
   */
  updateGraph(changes: SpecificationChanges): void {
    if (!this.graph) {
      throw new Error("Graph not initialized. Call buildGraph first.");
    }

    // Remove deleted components
    changes.removedComponents.forEach((componentId) => {
      this.graph!.nodes = this.graph!.nodes.filter(
        (node) => node.id !== componentId,
      );
      this.graph!.edges = this.graph!.edges.filter(
        (edge) => edge.from !== componentId && edge.to !== componentId,
      );
    });

    // Add new components
    const newNodes = this.buildNodes(changes.addedComponents);
    this.graph.nodes.push(...newNodes);

    // Rebuild edges
    this.graph.edges = this.buildEdges(this.graph.nodes);

    // Recalculate layout
    this.applyLayout(this.graph.nodes, this.graph.layout);
  }

  /**
   * Get component at position (for click handling)
   */
  getComponentAt(x: number, y: number): ComponentNode | null {
    if (!this.graph) {
      return null;
    }

    // Check all nodes (including children)
    return this.findComponentAtPosition(this.graph.nodes, x, y);
  }

  /**
   * Highlight a component
   */
  highlightComponent(componentId: string): void {
    this.highlightedComponentId = componentId;
  }

  /**
   * Clear component highlight
   */
  clearHighlight(): void {
    this.highlightedComponentId = null;
  }

  /**
   * Get highlighted component ID
   */
  getHighlightedComponentId(): string | null {
    return this.highlightedComponentId;
  }

  /**
   * Animate data flow between components
   */
  animateTransaction(from: string, to: string, data: TransactionData): void {
    if (!this.graph) {
      return;
    }

    const fromNode = this.findNodeById(this.graph.nodes, from);
    const toNode = this.findNodeById(this.graph.nodes, to);

    if (!fromNode || !toNode) {
      return;
    }

    const animation: TransactionAnimation = {
      id: data.id,
      from: fromNode,
      to: toNode,
      data,
      startTime: performance.now(),
      duration: 1000, // 1 second animation
      progress: 0,
    };

    this.activeTransactions.set(data.id, animation);
  }

  /**
   * Update transaction animations
   */
  updateAnimations(): void {
    const currentTime = performance.now();
    const completedAnimations: string[] = [];

    this.activeTransactions.forEach((animation, id) => {
      const elapsed = currentTime - animation.startTime;
      animation.progress = Math.min(elapsed / animation.duration, 1.0);

      if (animation.progress >= 1.0) {
        completedAnimations.push(id);
      }
    });

    // Remove completed animations
    completedAnimations.forEach((id) => {
      this.activeTransactions.delete(id);
    });
  }

  /**
   * Get active transaction animations
   */
  getActiveTransactions(): TransactionAnimation[] {
    return Array.from(this.activeTransactions.values());
  }

  /**
   * Get current graph
   */
  getGraph(): ComponentGraph | null {
    return this.graph ? { ...this.graph } : null;
  }

  /**
   * Build nodes from component specifications
   */
  private buildNodes(
    components: UVMComponentSpec[],
    parentX = 0,
    parentY = 0,
    level = 0,
  ): ComponentNode[] {
    const nodes: ComponentNode[] = [];
    const horizontalSpacing = 200;
    const verticalSpacing = 150;

    components.forEach((comp, index) => {
      const x = parentX + index * horizontalSpacing;
      const y = parentY + level * verticalSpacing;

      const size = this.getComponentSize(comp.type);

      const children = comp.children
        ? this.buildNodes(comp.children, x, y + verticalSpacing, level + 1)
        : [];

      const node: ComponentNode = {
        id: comp.id,
        type: comp.type,
        name: comp.name,
        position: { x, y },
        size,
        children,
        properties: comp.properties || {},
      };

      nodes.push(node);
    });

    return nodes;
  }

  /**
   * Build edges between components
   */
  private buildEdges(nodes: ComponentNode[]): ComponentEdge[] {
    const edges: ComponentEdge[] = [];

    // Create edges based on component hierarchy and types
    nodes.forEach((node) => {
      // Connect parent to children
      node.children.forEach((child) => {
        edges.push({
          id: `${node.id}-${child.id}`,
          from: node.id,
          to: child.id,
          label: "contains",
          type: "config",
        });
      });

      // Connect drivers to monitors within same agent
      if (node.type === "agent") {
        const drivers = node.children.filter((c) => c.type === "driver");
        const monitors = node.children.filter((c) => c.type === "monitor");

        drivers.forEach((driver) => {
          monitors.forEach((monitor) => {
            edges.push({
              id: `${driver.id}-${monitor.id}`,
              from: driver.id,
              to: monitor.id,
              label: "TLM",
              type: "tlm",
            });
          });
        });
      }

      // Recursively process children
      if (node.children.length > 0) {
        edges.push(...this.buildEdges(node.children));
      }
    });

    return edges;
  }

  /**
   * Apply layout algorithm to nodes
   */
  private applyLayout(
    nodes: ComponentNode[],
    layout: ComponentGraph["layout"],
  ): void {
    if (layout.type === "hierarchical") {
      this.applyHierarchicalLayout(nodes, layout);
    }
  }

  /**
   * Apply hierarchical layout
   */
  private applyHierarchicalLayout(
    nodes: ComponentNode[],
    layout: ComponentGraph["layout"],
  ): void {
    const { horizontal, vertical } = layout.spacing;

    nodes.forEach((node, index) => {
      if (layout.direction === "top-down") {
        node.position.x = index * horizontal;
        node.position.y = 0;

        // Position children below
        node.children.forEach((child, childIndex) => {
          child.position.x = node.position.x + childIndex * horizontal;
          child.position.y = node.position.y + vertical;
        });
      } else {
        // left-right
        node.position.x = 0;
        node.position.y = index * vertical;

        // Position children to the right
        node.children.forEach((child, childIndex) => {
          child.position.x = node.position.x + horizontal;
          child.position.y = node.position.y + childIndex * vertical;
        });
      }
    });
  }

  /**
   * Get component size based on type
   */
  private getComponentSize(type: ComponentNode["type"]): {
    width: number;
    height: number;
  } {
    const sizes: Record<
      ComponentNode["type"],
      { width: number; height: number }
    > = {
      env: { width: 300, height: 200 },
      agent: { width: 200, height: 150 },
      driver: { width: 120, height: 80 },
      monitor: { width: 120, height: 80 },
      sequencer: { width: 120, height: 80 },
      scoreboard: { width: 150, height: 100 },
    };

    return sizes[type] || { width: 100, height: 60 };
  }

  /**
   * Find component at position (recursive)
   */
  private findComponentAtPosition(
    nodes: ComponentNode[],
    x: number,
    y: number,
  ): ComponentNode | null {
    for (const node of nodes) {
      // Check if point is within node bounds
      if (
        x >= node.position.x &&
        x <= node.position.x + node.size.width &&
        y >= node.position.y &&
        y <= node.position.y + node.size.height
      ) {
        return node;
      }

      // Check children
      if (node.children.length > 0) {
        const childResult = this.findComponentAtPosition(node.children, x, y);
        if (childResult) {
          return childResult;
        }
      }
    }

    return null;
  }

  /**
   * Find node by ID (recursive)
   */
  private findNodeById(
    nodes: ComponentNode[],
    id: string,
  ): ComponentNode | null {
    for (const node of nodes) {
      if (node.id === id) {
        return node;
      }

      if (node.children.length > 0) {
        const childResult = this.findNodeById(node.children, id);
        if (childResult) {
          return childResult;
        }
      }
    }

    return null;
  }
}

/**
 * Transaction animation data
 */
interface TransactionAnimation {
  id: string;
  from: ComponentNode;
  to: ComponentNode;
  data: TransactionData;
  startTime: number;
  duration: number;
  progress: number; // 0.0 to 1.0
}
