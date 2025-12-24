import GarmentModel from './GarmentModel.jsx';

export default function Shirt({ color, onStatus, onMeshReady, onMeshesReady }) {
  return (
    <GarmentModel
      modelPath="/shirt_baked.glb"
      color={color}
      onStatus={onStatus}
      onMeshReady={onMeshReady}
      onMeshesReady={onMeshesReady}
    />
  );
}
