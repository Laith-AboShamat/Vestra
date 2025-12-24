import GarmentModel from './GarmentModel.jsx';

export default function BasketballJacket({ color, onStatus }) {
  return <GarmentModel modelPath="/basketball_jacket.glb" color={color} onStatus={onStatus} />;
}
