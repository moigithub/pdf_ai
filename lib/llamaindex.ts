import { randomUUID } from 'crypto'
import { BaseReader, Document, Metadata } from 'llamaindex'
import PdfParse from 'pdf-parse'
//---
export class URLPDFReader implements BaseReader {
  async loadData(url: string): Promise<Document<Metadata>[]> {
    // const dataBuffer = (await fs.readFile(file))as any;
    const dataBuffer = await fetch(url)
    const blob = await dataBuffer.blob()
    const arrayBuffer = await blob.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const content = await PdfParse(buffer)
    return [new Document({ text: content.text, id_: randomUUID() })]
  }
}
