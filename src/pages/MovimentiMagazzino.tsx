import { MagazzinoSection } from '../gestionale/features/magazzino'
import { useRequireStudioFeature } from '../hooks/useRequireStudioFeature'
import '../gestionale/theme/magazzino-section.css'

export default function MovimentiMagazzino() {
  useRequireStudioFeature('warehouse')
  return <MagazzinoSection />
}
