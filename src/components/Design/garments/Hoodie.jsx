import GarmentModel from './GarmentModel.jsx';

export default function Hoodie({ color, onStatus }) {
  return <GarmentModel modelPath="/hoodie.glb" color={color} onStatus={onStatus} />;
}
