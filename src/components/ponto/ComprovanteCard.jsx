import Card from "../ui/Card"
import Button from "../ui/Button"
import { formatDateTime } from "../../lib/calculo"

export default function ComprovanteCard({ receipt, status, onCopy, onDownload, onDownloadXLSX }) {
  return (
    <Card className="border-emerald-200 bg-emerald-50/50">
      <h3 className="mb-2 text-sm font-semibold text-emerald-800">Ponto registrado</h3>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
        <dt className="text-neutral-500">NSR</dt>
        <dd className="text-neutral-900">{receipt.nsr}</dd>
        <dt className="text-neutral-500">Tipo</dt>
        <dd className="text-neutral-900">{receipt.type}</dd>
        <dt className="text-neutral-500">Data e hora</dt>
        <dd className="text-neutral-900">{formatDateTime(receipt.time)}</dd>
      </dl>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button variant="secondary" onClick={onCopy}>Copiar texto</Button>
        <Button variant="secondary" onClick={onDownload}>Baixar .txt</Button>
        <Button variant="secondary" onClick={onDownloadXLSX}>Baixar planilha (Excel)</Button>
      </div>
      {status && <p className="mt-2 text-xs text-neutral-500">{status}</p>}
    </Card>
  )
}
