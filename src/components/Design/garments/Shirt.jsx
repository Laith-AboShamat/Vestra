import GarmentModel from './GarmentModel.jsx';

export default function Shirt({ color, onStatus }) {
  return <GarmentModel modelPath="/shirt_baked.glb" color={color} onStatus={onStatus} />;
}
