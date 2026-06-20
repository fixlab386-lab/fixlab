import { ProdottiSection } from '../gestionale/features/prodotti'
import { useRequireStudioFeature } from '../hooks/useRequireStudioFeature'

export default function Magazzino() {
  useRequireStudioFeature('warehouse')
  return <ProdottiSection />
}
