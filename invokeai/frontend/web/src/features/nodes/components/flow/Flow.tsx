import { useGlobalMenuClose, useToken } from '@invoke-ai/ui-library';
import { useAppDispatch, useAppSelector } from 'app/store/storeHooks';
import { useConnection } from 'features/nodes/hooks/useConnection';
import { useCopyPaste } from 'features/nodes/hooks/useCopyPaste';
import { useIsValidConnection } from 'features/nodes/hooks/useIsValidConnection';
import { useWorkflowWatcher } from 'features/nodes/hooks/useWorkflowWatcher';
import {
  $cursorPos,
  connectionMade,
  edgeAdded,
  edgeChangeStarted,
  edgeDeleted,
  edgesChanged,
  edgesDeleted,
  nodesChanged,
  nodesDeleted,
  redo,
  selectedAll,
  selectedEdgesChanged,
  selectedNodesChanged,
  undo,
  viewportChanged,
} from 'features/nodes/store/nodesSlice';
import { $flow } from 'features/nodes/store/reactFlowInstance';
import type { CSSProperties, MouseEvent } from 'react';
import { memo, useCallback, useMemo, useRef } from 'react';
import { useHotkeys } from 'react-hotkeys-hook';
import type {
  OnEdgesChange,
  OnEdgesDelete,
  OnEdgeUpdateFunc,
  OnInit,
  OnMoveEnd,
  OnNodesChange,
  OnNodesDelete,
  OnSelectionChangeFunc,
  ProOptions,
  ReactFlowProps,
} from 'reactflow';
import { Background, ReactFlow } from 'reactflow';

import CustomConnectionLine from './connectionLines/CustomConnectionLine';
import InvocationCollapsedEdge from './edges/InvocationCollapsedEdge';
import InvocationDefaultEdge from './edges/InvocationDefaultEdge';
import CurrentImageNode from './nodes/CurrentImage/CurrentImageNode';
import InvocationNodeWrapper from './nodes/Invocation/InvocationNodeWrapper';
import NotesNode from './nodes/Notes/NotesNode';

const DELETE_KEYS = ['Delete', 'Backspace'];

const edgeTypes = {
  collapsed: InvocationCollapsedEdge,
  default: InvocationDefaultEdge,
};

const nodeTypes = {
  invocation: InvocationNodeWrapper,
  current_image: CurrentImageNode,
  notes: NotesNode,
};

// TODO: can we support reactflow? if not, we could style the attribution so it matches the app
const proOptions: ProOptions = { hideAttribution: true };

const snapGrid: [number, number] = [25, 25];

export const Flow = memo(() => {
  const dispatch = useAppDispatch();
  const nodes = useAppSelector((s) => s.nodes.present.nodes);
  const edges = useAppSelector((s) => s.nodes.present.edges);
  const viewport = useAppSelector((s) => s.nodes.present.viewport);
  const shouldSnapToGrid = useAppSelector((s) => s.workflowSettings.shouldSnapToGrid);
  const selectionMode = useAppSelector((s) => s.workflowSettings.selectionMode);
  const { onConnectStart, onConnect, onConnectEnd } = useConnection();
  const flowWrapper = useRef<HTMLDivElement>(null);
  const isValidConnection = useIsValidConnection();
  useWorkflowWatcher();
  const [borderRadius] = useToken('radii', ['base']);

  const flowStyles = useMemo<CSSProperties>(
    () => ({
      borderRadius,
    }),
    [borderRadius]
  );

  const onNodesChange: OnNodesChange = useCallback(
    (changes) => {
      dispatch(nodesChanged(changes));
    },
    [dispatch]
  );

  const onEdgesChange: OnEdgesChange = useCallback(
    (changes) => {
      dispatch(edgesChanged(changes));
    },
    [dispatch]
  );

  const onEdgesDelete: OnEdgesDelete = useCallback(
    (edges) => {
      dispatch(edgesDeleted(edges));
    },
    [dispatch]
  );

  const onNodesDelete: OnNodesDelete = useCallback(
    (nodes) => {
      dispatch(nodesDeleted(nodes));
    },
    [dispatch]
  );

  const handleSelectionChange: OnSelectionChangeFunc = useCallback(
    ({ nodes, edges }) => {
      dispatch(selectedNodesChanged(nodes ? nodes.map((n) => n.id) : []));
      dispatch(selectedEdgesChanged(edges ? edges.map((e) => e.id) : []));
    },
    [dispatch]
  );

  const handleMoveEnd: OnMoveEnd = useCallback(
    (e, viewport) => {
      dispatch(viewportChanged(viewport));
    },
    [dispatch]
  );

  const { onCloseGlobal } = useGlobalMenuClose();
  const handlePaneClick = useCallback(() => {
    onCloseGlobal();
  }, [onCloseGlobal]);

  const onInit: OnInit = useCallback((flow) => {
    $flow.set(flow);
    flow.fitView();
  }, []);

  const onMouseMove = useCallback((event: MouseEvent<HTMLDivElement>) => {
    if (flowWrapper.current?.getBoundingClientRect()) {
      $cursorPos.set(
        $flow.get()?.screenToFlowPosition({
          x: event.clientX,
          y: event.clientY,
        }) ?? null
      );
    }
  }, []);

  // #region Updatable Edges

  /**
   * Adapted from https://reactflow.dev/docs/examples/edges/updatable-edge/
   * and https://reactflow.dev/docs/examples/edges/delete-edge-on-drop/
   *
   * - Edges can be dragged from one handle to another.
   * - If the user drags the edge away from the node and drops it, delete the edge.
   * - Do not delete the edge if the cursor didn't move (resolves annoying behaviour
   *   where the edge is deleted if you click it accidentally).
   */

  // We have a ref for cursor position, but it is the *projected* cursor position.
  // Easiest to just keep track of the last mouse event for this particular feature
  const edgeUpdateMouseEvent = useRef<MouseEvent>();

  const onEdgeUpdateStart: NonNullable<ReactFlowProps['onEdgeUpdateStart']> = useCallback(
    (e, edge, _handleType) => {
      // update mouse event
      edgeUpdateMouseEvent.current = e;
      // always delete the edge when starting an updated
      dispatch(edgeDeleted(edge.id));
      dispatch(edgeChangeStarted());
    },
    [dispatch]
  );

  const onEdgeUpdate: OnEdgeUpdateFunc = useCallback(
    (_oldEdge, newConnection) => {
      // instead of updating the edge (we deleted it earlier), we instead create
      // a new one.
      dispatch(connectionMade(newConnection));
    },
    [dispatch]
  );

  const onEdgeUpdateEnd: NonNullable<ReactFlowProps['onEdgeUpdateEnd']> = useCallback(
    (e, edge, _handleType) => {
      // Handle the case where user begins a drag but didn't move the cursor -
      // bc we deleted the edge, we need to add it back
      if (
        // ignore touch events
        !('touches' in e) &&
        edgeUpdateMouseEvent.current?.clientX === e.clientX &&
        edgeUpdateMouseEvent.current?.clientY === e.clientY
      ) {
        dispatch(edgeAdded(edge));
      }
      // reset mouse event
      edgeUpdateMouseEvent.current = undefined;
    },
    [dispatch]
  );

  // #endregion

  const { copySelection, pasteSelection } = useCopyPaste();

  useHotkeys(['Ctrl+c', 'Meta+c'], (e) => {
    e.preventDefault();
    copySelection();
  });

  useHotkeys(['Ctrl+a', 'Meta+a'], (e) => {
    e.preventDefault();
    dispatch(selectedAll());
  });

  useHotkeys(['Ctrl+v', 'Meta+v'], (e) => {
    e.preventDefault();
    pasteSelection();
  });

  useHotkeys(
    ['meta+z', 'ctrl+z'],
    () => {
      dispatch(undo());
    },
    [dispatch]
  );

  useHotkeys(
    ['meta+shift+z', 'ctrl+shift+z'],
    () => {
      dispatch(redo());
    },
    [dispatch]
  );

  return (
    <ReactFlow
      id="workflow-editor"
      ref={flowWrapper}
      defaultViewport={viewport}
      nodeTypes={nodeTypes}
      edgeTypes={edgeTypes}
      nodes={nodes}
      edges={edges}
      onInit={onInit}
      onMouseMove={onMouseMove}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onEdgesDelete={onEdgesDelete}
      onEdgeUpdate={onEdgeUpdate}
      onEdgeUpdateStart={onEdgeUpdateStart}
      onEdgeUpdateEnd={onEdgeUpdateEnd}
      onNodesDelete={onNodesDelete}
      onConnectStart={onConnectStart}
      onConnect={onConnect}
      onConnectEnd={onConnectEnd}
      onMoveEnd={handleMoveEnd}
      connectionLineComponent={CustomConnectionLine}
      onSelectionChange={handleSelectionChange}
      isValidConnection={isValidConnection}
      minZoom={0.1}
      snapToGrid={shouldSnapToGrid}
      snapGrid={snapGrid}
      connectionRadius={30}
      proOptions={proOptions}
      style={flowStyles}
      onPaneClick={handlePaneClick}
      deleteKeyCode={DELETE_KEYS}
      selectionMode={selectionMode}
    >
      <Background />
    </ReactFlow>
  );
});

Flow.displayName = 'Flow';
