'use client'
import { Document, Page, pdfjs } from 'react-pdf'

import 'react-pdf/dist/Page/AnnotationLayer.css'
import 'react-pdf/dist/Page/TextLayer.css'
import 'simplebar-react/dist/simplebar.min.css'

import { ChevronDown, ChevronUp, Loader2, RotateCw, Search } from 'lucide-react'
import { useToast } from './ui/use-toast'
import { useResizeDetector } from 'react-resize-detector'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { cn } from '@/lib/utils'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from './ui/dropdown-menu'
import Simplebar from 'simplebar-react'
import { PdfFullscreen } from './pdf-full-screen'

// pdfjs.GlobalWorkerOptions.workerSrc = new URL(
//   'pdfjs-dist/build/pdf.worker.min.js',
//   import.meta.url
// ).toString()
// console.log({ pdfjs: pdfjs.version })

//using cdn
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`

interface PDFRendererProps {
  url: string
}

export const PDFRenderer = ({ url }: PDFRendererProps) => {
  const { toast } = useToast()
  const [numPages, setNumPages] = useState(1)
  const [currPage, setCurrPage] = useState(1)
  const [scale, setScale] = useState(1)
  const [rotation, setRotation] = useState(0)
  const { width, ref } = useResizeDetector()

  const formValidator = z.object({
    page: z.string().refine(num => Number(num) > 0 && Number(num) <= numPages)
  })

  type typeFormValidator = z.infer<typeof formValidator>

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue
  } = useForm<typeFormValidator>({
    defaultValues: {
      page: '1'
    },
    resolver: zodResolver(formValidator)
  })

  const handlePageSubmit = ({ page }: typeFormValidator) => {
    setCurrPage(Number(page))
    setValue('page', page)
  }

  return (
    <div>
      <div className='h-14 w-full border-b border-zinc-200 flex items-center justify-between'>
        <div className='flex items-center gap-1 5'>
          <Button
            onClick={() => {
              setCurrPage(prev => (prev - 1 > 1 ? prev - 1 : 1))
              setValue('page', String(currPage - 1))
            }}
            aria-label='previuos page'
            variant={'ghost'}
          >
            <ChevronDown className='h-4 w-4' />
          </Button>

          <div className='flex items-center gap-1.5'>
            <Input
              className={cn('w-12 h-8', errors.page && 'focus-visible:ring-red-500')}
              {...register('page')}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  handleSubmit(handlePageSubmit)()
                }
              }}
            />
            <p>
              <span>/</span>
              <span>{numPages ?? 'x'}</span>
            </p>
          </div>
          <Button
            onClick={() => {
              setCurrPage(prev => (prev + 1 > numPages ? numPages : prev + 1))
              setValue('page', String(currPage + 1))
            }}
            aria-label='next page'
            variant={'ghost'}
          >
            <ChevronUp className='h-4 w-4' />
          </Button>
        </div>

        <div className='space-x-2'>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className='gap-1.5' aria-label='zoom' variant={'ghost'}>
                <Search className='h-4 w-4' />
                {scale * 100}% <ChevronDown className='h-3 w-3 opacity-50' />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onSelect={() => setScale(1)}>100%</DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setScale(1.5)}>150%</DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setScale(2)}>200%</DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setScale(2.5)}>250%</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            aria-label='rotate 90 degrees'
            onClick={() => setRotation(prev => prev + 90)}
            variant='ghost'
          >
            <RotateCw className='h-4 w-4' />
          </Button>

          <PdfFullscreen url={url} />
        </div>
      </div>

      <div className='flex-1 w-full max-h-screen'>
        <Simplebar autoHide={false} className='max-h-[calc(100vh-10rem)]'>
          <div ref={ref}>
            <Document
              file={url}
              className='max-h-full'
              loading={
                <div className='flex justify-center'>
                  <Loader2 className='my-24 h-6 w-6 animate-spin' />
                </div>
              }
              onLoadSuccess={({ numPages }) => {
                setNumPages(numPages)
              }}
              onLoadError={() => {
                toast({
                  title: 'Error loading pdf',
                  description: 'try again later',
                  variant: 'destructive'
                })
              }}
            >
              <Page
                pageNumber={currPage}
                width={width ? width : 1}
                scale={scale}
                rotate={rotation}
              />
            </Document>
          </div>
        </Simplebar>
      </div>
    </div>
  )
}
