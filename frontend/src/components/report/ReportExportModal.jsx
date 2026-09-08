import { useEffect, useState } from 'react'
import { CheckCircle2, Loader2, X, Download, Printer } from 'lucide-react'
import Modal from '../ui/Modal.jsx'
import Button from '../ui/Button.jsx'
import { renderReportHtml, buildReportFileName } from './reportModel.js'

/*
 * Export flow for the investigation report.
 *   PREPARING REPORT  → simulated assembly (no server involved)
 *   REPORT READY      → DOWNLOAD REPORT / PRINT REPORT / CLOSE
 * Downloads are self-contained HTML; printing opens a dedicated window
 * and triggers the browser print dialog.
 */
const ReportExportModal = ({ open, onClose, model }) => {
  const [phase, setPhase] = useState('preparing')

  useEffect(() => {
    if (open) {
      setPhase('preparing')
      const t = setTimeout(() => setPhase('ready'), 900)
      return () => clearTimeout(t)
    }
    setPhase('preparing')
  }, [open])

  const handleDownload = () => {
    const blob = new Blob([renderReportHtml(model)], { type: 'text/html;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = buildReportFileName(model.caseId)
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handlePrint = () => {
    const html = renderReportHtml(model)
    const w = window.open('', '_blank', 'width=960,height=720')
    if (!w) return
    w.document.open()
    w.document.write(html)
    w.document.close()
    w.onload = () => {
      setTimeout(() => w.print(), 250)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Export investigation report" labelledBy="report-export-title">
      <div className="flex flex-col items-center justify-center px-2 py-8 text-center">
        {phase === 'preparing' ? (
          <>
            <Loader2 className="mb-4 h-8 w-8 animate-spin text-cyan-brand" aria-hidden="true" />
            <h3 id="report-export-title" className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-200">
              Preparing report
            </h3>
            <p className="mt-1 text-sm text-slate-400">Assembling synthetic case data…</p>
          </>
        ) : (
          <>
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-emerald-500/30 bg-emerald-500/10">
              <CheckCircle2 className="h-6 w-6 text-emerald-400" aria-hidden="true" />
            </div>
            <h3 id="report-export-title" className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-200">
              Report ready
            </h3>
            <p className="mt-1 text-sm text-slate-400">
              Self-contained HTML · {buildReportFileName(model.caseId)}
            </p>
          </>
        )}
      </div>

      {phase === 'ready' && (
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Button onClick={handleDownload}>
            <Download className="h-4 w-4" aria-hidden="true" />
            Download report
          </Button>
          <Button variant="outline" onClick={handlePrint}>
            <Printer className="h-4 w-4" aria-hidden="true" />
            Print report
          </Button>
          <Button variant="ghost" onClick={onClose} className="sm:col-span-2">
            Close
          </Button>
        </div>
      )}
    </Modal>
  )
}

export default ReportExportModal