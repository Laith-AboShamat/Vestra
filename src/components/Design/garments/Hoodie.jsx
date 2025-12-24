import GarmentModel from './GarmentModel.jsx';

export default function Hoodie({ color, onStatus, onMeshReady, onMeshesReady }) {
  return (
    <GarmentModel
      modelPath="/hoodie.glb"
      color={color}
      onStatus={onStatus}
      onMeshReady={onMeshReady}
      onMeshesReady={onMeshesReady}
    />
  );
}
