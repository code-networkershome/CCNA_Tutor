
import React, { useCallback, useMemo } from 'react';
useNodesState,
    useEdgesState,
    Node,
    Edge,
    Controls,
    Background,
    BackgroundVariant,
    MarkerType,
    Handle,
    Position,
    OnConnect,
    ConnectionMode
} from 'reactflow';
import 'reactflow/dist/style.css';
import { NetworkTopology } from '@/types';

interface TopologyCanvasProps {
    topology: NetworkTopology;
    activeDeviceId: string;
    onDeviceSelect: (deviceId: string) => void;
    onConnect?: (params: { source: string, sourcePort: string, target: string, targetPort: string }) => void;
    onPositionsChange?: (devices: Record<string, { x: number, y: number }>) => void;
}

// Custom Node Integration
const DeviceNode = ({ data }: { data: { label: string, type: 'router' | 'switch' | 'pc', isActive: boolean, interfaces: string[] } }) => (
    <div className={`px-4 py-2 shadow-md rounded-md border-2 min-w-[150px] ${data.isActive ? 'border-blue-500 bg-blue-50 dark:bg-blue-900' : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'
        }`}>
        <div className="flex flex-col items-center mb-2">
            <div className={`text-2xl mb-1 ${data.type === 'router' ? 'text-blue-600' : (data.type === 'switch' ? 'text-green-600' : 'text-gray-600')}`}>
                {data.type === 'router' ? '🌐' : (data.type === 'switch' ? '🔌' : '💻')}
            </div>
            <div className="font-bold text-sm text-gray-900 dark:text-gray-100">{data.label}</div>
            <div className="text-xs text-gray-500 capitalize">{data.type}</div>
        </div>

        {/* Interfaces List acting as Handles */}
        <div className="flex flex-col gap-1 w-full relative">
            {data.interfaces.map((iface, index) => {
                const isEven = index % 2 === 0;
                return (
                    <div key={iface} className={`relative h-4 text-[10px] text-gray-500 flex ${isEven ? 'justify-start' : 'justify-end'}`}>
                        <span className="px-1">{iface.replace('GigabitEthernet', 'Gi').replace('FastEthernet', 'Fa')}</span>
                        <Handle
                            type="source"
                            position={isEven ? Position.Left : Position.Right}
                            id={iface}
                            className={`!w-3 !h-3 !bg-gray-400`}
                            isConnectable={true}
                        />
                    </div>
                );
            })}
        </div>
    </div>
);

const nodeTypes = {
    networkDevice: DeviceNode,
};

export default function TopologyCanvas({ topology, activeDeviceId, onDeviceSelect, onConnect, onPositionsChange }: TopologyCanvasProps) {
    const [nodes, setNodes, onNodesChange] = useNodesState([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState([]);

    // Sync Topology to Nodes/Edges
    React.useEffect(() => {
        const newNodes: Node[] = Object.values(topology.devices).map(dev => ({
            id: dev.id,
            type: 'networkDevice',
            position: dev.position || { x: 100 + Math.random() * 50, y: 100 + Math.random() * 50 },
            data: {
                label: dev.name || dev.id,
                type: dev.type,
                isActive: dev.id === activeDeviceId,
                interfaces: Object.keys(dev.interfaces || {})
            },
        }));
        setNodes(newNodes);

        const newEdges: Edge[] = topology.links.map(link => ({
            id: link.id,
            source: link.source.deviceId,
            target: link.target.deviceId,
            sourceHandle: link.source.port,
            targetHandle: link.target.port,
            type: 'default',
            animated: link.status === 'up',
            style: { stroke: link.status === 'up' ? '#10b981' : '#ef4444', strokeWidth: 2 },
            markerEnd: { type: MarkerType.ArrowClosed },
        }));
        setEdges(newEdges);
    }, [topology, activeDeviceId, setNodes, setEdges]);

    const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
        onDeviceSelect(node.id);
    }, [onDeviceSelect]);

    const handleConnect: OnConnect = useCallback((connection) => {
        if (onConnect && connection.source && connection.target && connection.sourceHandle && connection.targetHandle) {
            onConnect({
                source: connection.source,
                sourcePort: connection.sourceHandle,
                target: connection.target,
                targetPort: connection.targetHandle
            });
        }
    }, [onConnect]);

    const onNodeDragStop = useCallback((event: any, node: Node) => {
        if (onPositionsChange) {
            onPositionsChange({
                [node.id]: { x: node.position.x, y: node.position.y }
            });
        }
    }, [onPositionsChange]);

    return (
        <div className="w-full h-[400px] border border-gray-200 dark:border-gray-800 rounded-lg bg-gray-50 dark:bg-gray-900 overflow-hidden relative">
            <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                nodeTypes={nodeTypes as any}
                onNodeClick={onNodeClick}
                onConnect={handleConnect}
                onNodeDragStop={onNodeDragStop}
                connectionMode={ConnectionMode.Loose}
                fitView
                attributionPosition="bottom-right"
            >
                <Background variant={BackgroundVariant.Dots} gap={12} size={1} />
                <Controls />
            </ReactFlow>
            <div className="absolute top-2 left-2 bg-white/80 dark:bg-black/50 p-2 rounded text-xs text-gray-500 font-mono pointer-events-none">
                Visual Topology (Drag port to port to connect)
            </div>
        </div>
    );
}
