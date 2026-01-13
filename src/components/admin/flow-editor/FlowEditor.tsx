import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ReactFlow,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  Connection,
  Edge,
  Node,
  BackgroundVariant,
  MarkerType,
  Panel,
  ConnectionMode,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import FlowNode from './FlowNode';
import AddNodeModal from './AddNodeModal';
import { Button } from '@/components/ui/button';
import { Save, RotateCcw, Maximize, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

export interface FlowStep {
  id: string;
  step_type: string;
  step_order: number;
  is_enabled: boolean;
  next_step_id: string | null;
  position_x: number;
  position_y: number;
  // Extended fields for category/promotion nodes
  target_category_id?: string | null;
  target_category_name?: string | null;
  target_banner_id?: string | null;
  target_banner_title?: string | null;
  target_banner_image?: string | null;
}

interface Category {
  id: string;
  name: string;
  icon?: string | null;
  image_url?: string | null;
}

interface Banner {
  id: string;
  title: string | null;
  image_url: string;
  is_active: boolean;
}

interface FlowEditorProps {
  steps: FlowStep[];
  onSave: (steps: FlowStep[]) => void;
  isSaving: boolean;
  categories?: Category[];
  banners?: Banner[];
  onBannerStatusChange?: (bannerId: string, isActive: boolean) => void;
}

const stepConfig: Record<string, { label: string; description: string; icon: string; isFixed: boolean; isDeletable?: boolean }> = {
  size: { label: 'Tamanho', description: 'Escolha o tamanho da pizza', icon: '📏', isFixed: true },
  flavor: { label: 'Sabores', description: 'Escolha os sabores', icon: '🍕', isFixed: true },
  edge: { label: 'Borda', description: 'Escolha a borda recheada', icon: '🧀', isFixed: false },
  dough: { label: 'Massa', description: 'Tipo de massa', icon: '🫓', isFixed: false },
  drink: { label: 'Bebida', description: 'Sugerir bebida', icon: '🥤', isFixed: false },
  cart: { label: 'Carrinho', description: 'Finalizar pedido', icon: '🛒', isFixed: true },
  category: { label: 'Categoria', description: 'Ir para categoria', icon: '📁', isFixed: false, isDeletable: true },
  promotion: { label: 'Promoção', description: 'Exibir banner', icon: '🎉', isFixed: false, isDeletable: true },
};

const defaultSteps: FlowStep[] = [
  { id: 'size', step_type: 'size', step_order: 1, is_enabled: true, next_step_id: 'flavor', position_x: 50, position_y: 200 },
  { id: 'flavor', step_type: 'flavor', step_order: 2, is_enabled: true, next_step_id: 'edge', position_x: 300, position_y: 200 },
  { id: 'edge', step_type: 'edge', step_order: 3, is_enabled: true, next_step_id: 'dough', position_x: 550, position_y: 100 },
  { id: 'dough', step_type: 'dough', step_order: 4, is_enabled: true, next_step_id: 'drink', position_x: 550, position_y: 300 },
  { id: 'drink', step_type: 'drink', step_order: 5, is_enabled: true, next_step_id: 'cart', position_x: 800, position_y: 200 },
  { id: 'cart', step_type: 'cart', step_order: 6, is_enabled: true, next_step_id: null, position_x: 1050, position_y: 200 },
];

const nodeTypes = { flowNode: FlowNode as any };

export default function FlowEditor({ steps: initialSteps, onSave, isSaving, categories = [], banners = [], onBannerStatusChange }: FlowEditorProps) {
  const [localSteps, setLocalSteps] = useState<FlowStep[]>(defaultSteps);
  const [reactFlowInstance, setReactFlowInstance] = useState<any>(null);
  const [addNodeModalOpen, setAddNodeModalOpen] = useState(false);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  // Merge initial steps with defaults whenever initialSteps changes
  useEffect(() => {
    // If we have saved steps, use them to override defaults
    if (initialSteps.length > 0) {
      // Start with default steps and merge saved data
      const baseSteps = defaultSteps.map(defaultStep => {
        const existing = initialSteps.find(s => s.step_type === defaultStep.step_type);
        if (existing) {
          return {
            ...defaultStep,
            is_enabled: existing.is_enabled,
            next_step_id: existing.next_step_id,
            position_x: existing.position_x || defaultStep.position_x,
            position_y: existing.position_y || defaultStep.position_y,
          };
        }
        return defaultStep;
      });

      // Add any custom nodes (category, promotion) from saved steps
      const customSteps = initialSteps.filter(s => s.step_type === 'category' || s.step_type === 'promotion');
      
      setLocalSteps([...baseSteps, ...customSteps]);
    } else {
      // No saved steps, use defaults
      setLocalSteps(defaultSteps);
    }
  }, [initialSteps]);

  const handleToggleStep = useCallback((stepId: string, enabled: boolean) => {
    setLocalSteps(prev => {
      const step = prev.find(s => s.id === stepId);
      
      // If this is a promotion step and we're enabling it, sync with banner status
      if (step?.step_type === 'promotion' && step.target_banner_id && enabled && onBannerStatusChange) {
        onBannerStatusChange(step.target_banner_id, true);
      }
      
      return prev.map(s => s.id === stepId ? { ...s, is_enabled: enabled } : s);
    });
  }, [onBannerStatusChange]);

  const handleDeleteNode = useCallback((stepId: string) => {
    setLocalSteps(prev => {
      // Remove the step and clear any connections to it
      const updated = prev
        .filter(step => step.id !== stepId)
        .map(step => step.next_step_id === stepId ? { ...step, next_step_id: null } : step);
      return updated;
    });
    toast.success('Nó removido do fluxo');
  }, []);

  // Build nodes from steps
  const nodes: Node[] = useMemo(() => {
    return localSteps.map(step => {
      const config = stepConfig[step.step_type] || { label: step.step_type, description: '', icon: '📦', isFixed: false };
      
      // Custom label for category/promotion nodes
      let label = config.label;
      let description = config.description;
      let icon = config.icon;
      let imageUrl: string | undefined;

      if (step.step_type === 'category' && step.target_category_name) {
        label = step.target_category_name;
        description = 'Ir para categoria';
      } else if (step.step_type === 'promotion' && step.target_banner_title) {
        label = step.target_banner_title;
        description = 'Banner promocional';
        imageUrl = step.target_banner_image || undefined;
      }

      return {
        id: step.id,
        type: 'flowNode',
        position: { x: step.position_x, y: step.position_y },
        data: {
          label,
          description,
          icon,
          imageUrl,
          isEnabled: step.is_enabled,
          isFixed: config.isFixed,
          isDeletable: config.isDeletable,
          onToggle: (enabled: boolean) => handleToggleStep(step.id, enabled),
          onDelete: () => handleDeleteNode(step.id),
        },
      };
    });
  }, [localSteps, handleToggleStep, handleDeleteNode]);

  // Build edges from steps
  const edges: Edge[] = useMemo(() => {
    return localSteps
      .filter(step => step.next_step_id)
      .map(step => {
        const isSourceEnabled = step.is_enabled;
        const isTargetEnabled = localSteps.find(s => s.id === step.next_step_id)?.is_enabled ?? false;
        const isActive = isSourceEnabled && isTargetEnabled;
        
        return {
          id: `e-${step.id}-${step.next_step_id}`,
          source: step.id,
          target: step.next_step_id!,
          type: 'smoothstep',
          animated: isActive,
          deletable: true,
          style: { 
            strokeWidth: 3,
            stroke: isActive ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))',
          },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            width: 20,
            height: 20,
            color: isActive ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))',
          },
        };
      });
  }, [localSteps]);

  const [nodesState, setNodes, onNodesChange] = useNodesState(nodes);
  const [edgesState, setEdges, onEdgesChange] = useEdgesState(edges);

  // Sync state when nodes/edges change
  useEffect(() => {
    setNodes(nodes);
  }, [nodes, setNodes]);

  useEffect(() => {
    setEdges(edges);
  }, [edges, setEdges]);

  // Handle new connection
  const onConnect = useCallback((params: Connection) => {
    if (!params.source || !params.target) return;
    
    // Update localSteps with new connection
    setLocalSteps(prev => prev.map(step => 
      step.id === params.source 
        ? { ...step, next_step_id: params.target as string }
        : step
    ));
  }, []);

  // Handle edge reconnect (drag arrow to new target)
  const onReconnect = useCallback((oldEdge: Edge, newConnection: Connection) => {
    if (!newConnection.source || !newConnection.target) return;
    
    setLocalSteps(prev => prev.map(step => 
      step.id === newConnection.source 
        ? { ...step, next_step_id: newConnection.target as string }
        : step
    ));
  }, []);

  // Handle edge deletion (single click + delete key or double-click)
  const onEdgesDelete = useCallback((deletedEdges: Edge[]) => {
    deletedEdges.forEach(edge => {
      setLocalSteps(prev => prev.map(step =>
        step.id === edge.source
          ? { ...step, next_step_id: null }
          : step
      ));
    });
  }, []);

  // Handle double-click on edge to delete it
  const onEdgeDoubleClick = useCallback((_: React.MouseEvent, edge: Edge) => {
    setLocalSteps(prev => prev.map(step =>
      step.id === edge.source
        ? { ...step, next_step_id: null }
        : step
    ));
    toast.info('Conexão removida');
  }, []);

  // Handle node position change
  const onNodeDragStop = useCallback((_: any, node: Node) => {
    setLocalSteps(prev => prev.map(step =>
      step.id === node.id
        ? { ...step, position_x: node.position.x, position_y: node.position.y }
        : step
    ));
  }, []);

  // Handle node selection
  const onNodeClick = useCallback((_: any, node: Node) => {
    setSelectedNodeId(node.id);
  }, []);

  const onPaneClick = useCallback(() => {
    setSelectedNodeId(null);
  }, []);

  const handleSave = useCallback(() => {
    onSave(localSteps);
  }, [localSteps, onSave]);

  const handleReset = useCallback(() => {
    setLocalSteps(defaultSteps);
  }, []);

  const handleFitView = useCallback(() => {
    reactFlowInstance?.fitView({ padding: 0.2 });
  }, [reactFlowInstance]);

  // Add category node
  const handleAddCategory = useCallback((category: Category) => {
    const newId = `category-${category.id}`;
    
    // Check if already exists
    if (localSteps.find(s => s.id === newId)) {
      toast.error('Esta categoria já está no fluxo');
      return;
    }

    const newStep: FlowStep = {
      id: newId,
      step_type: 'category',
      step_order: localSteps.length + 1,
      is_enabled: true,
      next_step_id: null,
      position_x: 300,
      position_y: 400,
      target_category_id: category.id,
      target_category_name: category.name,
    };

    setLocalSteps(prev => [...prev, newStep]);
    toast.success(`Categoria "${category.name}" adicionada ao fluxo`);
  }, [localSteps]);

  // Add promotion node
  const handleAddPromotion = useCallback((banner: Banner) => {
    const newId = `promotion-${banner.id}`;
    
    // Check if already exists
    if (localSteps.find(s => s.id === newId)) {
      toast.error('Este banner já está no fluxo');
      return;
    }

    const newStep: FlowStep = {
      id: newId,
      step_type: 'promotion',
      step_order: localSteps.length + 1,
      is_enabled: true,
      next_step_id: null,
      position_x: 300,
      position_y: 450,
      target_banner_id: banner.id,
      target_banner_title: banner.title || 'Banner Promocional',
      target_banner_image: banner.image_url,
    };

    setLocalSteps(prev => [...prev, newStep]);
    
    // Activate banner if it was inactive
    if (!banner.is_active && onBannerStatusChange) {
      onBannerStatusChange(banner.id, true);
    }
    
    toast.success('Banner promocional adicionado ao fluxo');
  }, [localSteps, onBannerStatusChange]);

  // Delete selected node
  const handleDeleteSelected = useCallback(() => {
    if (!selectedNodeId) return;
    
    const step = localSteps.find(s => s.id === selectedNodeId);
    if (!step) return;

    const config = stepConfig[step.step_type];
    if (config?.isFixed) {
      toast.error('Etapas fixas não podem ser removidas');
      return;
    }

    if (!config?.isDeletable) {
      toast.error('Esta etapa não pode ser removida');
      return;
    }

    handleDeleteNode(selectedNodeId);
    setSelectedNodeId(null);
  }, [selectedNodeId, localSteps, handleDeleteNode]);

  return (
    <div className="flex flex-col gap-4">
      {/* Controls header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Editor de Fluxo</h3>
          <p className="text-sm text-muted-foreground">
            Arraste os nós • Conecte arrastando das bolinhas • Duplo clique na seta para remover
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setAddNodeModalOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Adicionar
          </Button>
          {selectedNodeId && localSteps.find(s => s.id === selectedNodeId && (s.step_type === 'category' || s.step_type === 'promotion')) && (
            <Button variant="destructive" size="sm" onClick={handleDeleteSelected}>
              <Trash2 className="w-4 h-4 mr-2" />
              Remover
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={handleReset}>
            <RotateCcw className="w-4 h-4 mr-2" />
            Resetar
          </Button>
          <Button size="sm" onClick={handleSave} disabled={isSaving}>
            <Save className="w-4 h-4 mr-2" />
            {isSaving ? 'Salvando...' : 'Salvar Fluxo'}
          </Button>
        </div>
      </div>
      
      {/* Flow canvas */}
      <div className="border-2 border-border rounded-xl overflow-hidden bg-muted/30 h-[550px] w-full">
        <ReactFlow
          nodes={nodesState}
          edges={edgesState}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onReconnect={onReconnect}
          onEdgesDelete={onEdgesDelete}
          onEdgeDoubleClick={onEdgeDoubleClick}
          onNodeDragStop={onNodeDragStop}
          onNodeClick={onNodeClick}
          onPaneClick={onPaneClick}
          onInit={setReactFlowInstance}
          nodeTypes={nodeTypes}
          connectionMode={ConnectionMode.Loose}
          fitView
          fitViewOptions={{ padding: 0.3 }}
          minZoom={0.3}
          maxZoom={2}
          deleteKeyCode={['Backspace', 'Delete']}
          selectionKeyCode={['Shift']}
          multiSelectionKeyCode={['Control', 'Meta']}
          panOnScroll={false}
          zoomOnScroll={true}
          zoomOnPinch={true}
          panOnDrag={[0, 1, 2]}
          selectNodesOnDrag={false}
          elevateEdgesOnSelect={true}
          proOptions={{ hideAttribution: true }}
          defaultEdgeOptions={{
            type: 'smoothstep',
            animated: true,
            style: { strokeWidth: 3, stroke: 'hsl(var(--primary))' },
            markerEnd: { type: MarkerType.ArrowClosed, color: 'hsl(var(--primary))' },
          }}
        >
          <Background 
            variant={BackgroundVariant.Dots} 
            gap={24} 
            size={2} 
            color="hsl(var(--muted-foreground) / 0.2)" 
          />
          <Controls 
            showZoom={true}
            showFitView={true}
            showInteractive={false}
            className="!bg-card !border-border !shadow-lg !rounded-lg"
          />
          <Panel position="bottom-right" className="flex gap-1">
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={handleFitView}>
              <Maximize className="w-4 h-4" />
            </Button>
          </Panel>
        </ReactFlow>
      </div>
      
      {/* Legend */}
      <div className="p-4 bg-muted/50 rounded-xl border border-border">
        <h4 className="font-medium mb-3 text-sm">Como usar:</h4>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-primary" />
            <span className="text-muted-foreground">Etapa ativa</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-muted-foreground/40" />
            <span className="text-muted-foreground">Etapa desativada</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-0.5 border-2 border-dashed border-primary" />
            <span className="text-muted-foreground">Etapa fixa</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-primary font-bold">→</span>
            <span className="text-muted-foreground">Arraste para conectar</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-destructive">✕</span>
            <span className="text-muted-foreground">Duplo clique = remover</span>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-3">
          💡 Use scroll do mouse para zoom • Clique em "Adicionar" para categorias e promoções • Duplo clique em setas para removê-las
        </p>
      </div>

      {/* Add Node Modal */}
      <AddNodeModal
        open={addNodeModalOpen}
        onOpenChange={setAddNodeModalOpen}
        categories={categories}
        banners={banners}
        onAddCategory={handleAddCategory}
        onAddPromotion={handleAddPromotion}
      />
    </div>
  );
}
