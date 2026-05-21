import { useEffect, useState, useSyncExternalStore } from "react";
import { clusterManager, type ClusterNodeRuntime, type ClusterPolicy } from "@/lib/clusterManager";

export function useCluster() {
  const nodes = useSyncExternalStore(
    (cb) => clusterManager.subscribe(cb),
    () => clusterManager.getNodes()
  );
  const [policy, setPolicyState] = useState<ClusterPolicy>(clusterManager.getPolicy());

  useEffect(() => {
    return clusterManager.subscribe(() => {
      setPolicyState({ ...clusterManager.getPolicy() });
    });
  }, []);

  return {
    nodes: nodes as ClusterNodeRuntime[],
    policy,
    master: clusterManager.getMaster(),
    addNode: clusterManager.addNode.bind(clusterManager),
    updateNode: clusterManager.updateNode.bind(clusterManager),
    removeNode: clusterManager.removeNode.bind(clusterManager),
    setMaster: clusterManager.setMaster.bind(clusterManager),
    testNode: clusterManager.testNode.bind(clusterManager),
    setPolicy: clusterManager.setPolicy.bind(clusterManager),
    dispatch: clusterManager.dispatch.bind(clusterManager),
  };
}