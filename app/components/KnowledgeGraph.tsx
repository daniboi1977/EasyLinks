'use client';

import { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { useRouter } from 'next/navigation';
import type { BookmarkWithTopics } from '@/types';

interface GraphNode extends d3.SimulationNodeDatum {
  id: string;
  type: 'topic' | 'bookmark';
  label: string;
  url?: string;
  connections: number;
}

interface GraphLink extends d3.SimulationLinkDatum<GraphNode> {
  source: string | GraphNode;
  target: string | GraphNode;
}

function nodeRadius(d: GraphNode): number {
  if (d.type === 'topic') return Math.max(12, 6 + d.connections * 3);
  return Math.max(5, 3 + d.connections * 2);
}

function drag(simulation: d3.Simulation<GraphNode, GraphLink>) {
  return d3.drag<SVGGElement, GraphNode>()
    .on('start', (event, d) => {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
    })
    .on('drag', (event, d) => {
      d.fx = event.x;
      d.fy = event.y;
    })
    .on('end', (event, d) => {
      if (!event.active) simulation.alphaTarget(0);
      d.fx = null;
      d.fy = null;
    });
}

export default function KnowledgeGraph({ bookmarks }: { bookmarks: BookmarkWithTopics[] }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const router = useRouter();

  useEffect(() => {
    const el = svgRef.current;
    if (!el || bookmarks.length === 0) return;

    const width = el.clientWidth || 800;
    const height = el.clientHeight || 600;

    d3.select(el).selectAll('*').remove();

    // Build graph data
    const topicConnectionCounts = new Map<string, number>();
    bookmarks.forEach((b) => {
      b.topics.forEach((t) => {
        topicConnectionCounts.set(t, (topicConnectionCounts.get(t) ?? 0) + 1);
      });
    });

    const nodes: GraphNode[] = [
      ...Array.from(topicConnectionCounts.entries()).map(([name, count]) => ({
        id: `topic:${name}`,
        type: 'topic' as const,
        label: name,
        connections: count,
      })),
      ...bookmarks.map((b) => ({
        id: `bookmark:${b.id}`,
        type: 'bookmark' as const,
        label: b.title ?? b.url,
        url: b.url,
        connections: b.topics.length,
      })),
    ];

    const links: GraphLink[] = bookmarks.flatMap((b) =>
      b.topics.map((t) => ({
        source: `bookmark:${b.id}`,
        target: `topic:${t}`,
      }))
    );

    const simulation = d3
      .forceSimulation(nodes)
      .force(
        'link',
        d3.forceLink<GraphNode, GraphLink>(links).id((d) => d.id).distance(75)
      )
      .force('charge', d3.forceManyBody().strength(-80).distanceMax(250))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force(
        'collision',
        d3.forceCollide<GraphNode>().radius((d) => nodeRadius(d) + 6)
      );

    const svg = d3.select(el).attr('viewBox', `0 0 ${width} ${height}`);

    // Zoom container
    const g = svg.append('g');
    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.15, 5])
      .on('zoom', (event) => g.attr('transform', event.transform));
    svg.call(zoom);

    const link = g
      .append('g')
      .selectAll('line')
      .data(links)
      .join('line')
      .attr('stroke', '#e5e7eb')
      .attr('stroke-width', 1.5);

    const node = g
      .append('g')
      .selectAll<SVGGElement, GraphNode>('g')
      .data(nodes)
      .join('g')
      .attr('cursor', 'pointer')
      .call(drag(simulation));

    node
      .append('circle')
      .attr('r', nodeRadius)
      .attr('fill', (d) => (d.type === 'topic' ? '#3b82f6' : '#94a3b8'))
      .attr('stroke', '#fff')
      .attr('stroke-width', 2);

    // Labels for topic nodes
    node
      .filter((d) => d.type === 'topic')
      .append('text')
      .text((d) => d.label)
      .attr('text-anchor', 'middle')
      .attr('dy', (d) => nodeRadius(d) + 13)
      .attr('font-size', '11px')
      .attr('font-family', 'sans-serif')
      .attr('fill', '#374151')
      .attr('pointer-events', 'none');

    node.append('title').text((d) => d.label);

    node.on('click', (event, d) => {
      event.stopPropagation();
      if (d.type === 'topic') {
        router.push(`/?topic=${encodeURIComponent(d.label)}`);
      } else if (d.url) {
        window.open(d.url, '_blank', 'noopener,noreferrer');
      }
    });

    simulation.on('tick', () => {
      link
        .attr('x1', (d) => (d.source as GraphNode).x ?? 0)
        .attr('y1', (d) => (d.source as GraphNode).y ?? 0)
        .attr('x2', (d) => (d.target as GraphNode).x ?? 0)
        .attr('y2', (d) => (d.target as GraphNode).y ?? 0);
      node.attr('transform', (d) => `translate(${d.x ?? 0},${d.y ?? 0})`);
    });

    simulation.on('end', () => {
      const xs = nodes.map((d) => d.x ?? 0);
      const ys = nodes.map((d) => d.y ?? 0);
      const padding = 40;
      const x0 = Math.min(...xs) - padding;
      const x1 = Math.max(...xs) + padding;
      const y0 = Math.min(...ys) - padding;
      const y1 = Math.max(...ys) + padding;
      const dx = x1 - x0;
      const dy = y1 - y0;
      if (dx <= 0 || dy <= 0) return;

      const scale = Math.min(width / dx, height / dy, 5);
      const tx = width / 2 - scale * (x0 + dx / 2);
      const ty = height / 2 - scale * (y0 + dy / 2);

      svg
        .transition()
        .duration(500)
        .call(zoom.transform, d3.zoomIdentity.translate(tx, ty).scale(scale));
    });

    return () => {
      simulation.stop();
    };
  }, [bookmarks, router]);

  if (bookmarks.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-sm text-gray-400">
        No bookmarks yet. Add some to see the graph.
      </div>
    );
  }

  return <svg ref={svgRef} className="w-full h-full" />;
}
