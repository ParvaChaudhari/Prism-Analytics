export async function exportDashboardPdf(element: HTMLElement, title: string, filename = 'prism-dashboard.pdf') {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
    import('html2canvas'),
    import('jspdf'),
  ])

  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    logging: false,
    backgroundColor: '#ffffff',
  })

  const imgData = canvas.toDataURL('image/png')
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' })

  const pageWidth = pdf.internal.pageSize.getWidth()
  const pageHeight = pdf.internal.pageSize.getHeight()
  const margin = 24

  // Add the dashboard title at the top of the first page
  const fontSize = 16
  pdf.setFontSize(fontSize)
  pdf.setFont('helvetica', 'bold')
  pdf.setTextColor(15, 23, 42) // Slate 900
  
  const textLines = pdf.splitTextToSize(title, pageWidth - margin * 2)
  pdf.text(textLines, margin, margin + fontSize)

  // Calculate dynamic startY based on number of lines (approx 1.2 line height)
  const textHeight = textLines.length * fontSize * 1.2
  const startY = margin + fontSize + textHeight

  const imgWidth = pageWidth - margin * 2
  const imgHeight = (canvas.height * imgWidth) / canvas.width

  let heightLeft = imgHeight
  let position = startY

  pdf.addImage(imgData, 'PNG', margin, position, imgWidth, imgHeight)
  heightLeft -= pageHeight - startY - margin

  while (heightLeft > 0) {
    position = heightLeft - imgHeight + margin
    pdf.addPage()
    pdf.addImage(imgData, 'PNG', margin, position, imgWidth, imgHeight)
    heightLeft -= pageHeight - margin * 2
  }

  pdf.save(filename)
}
