import { db } from '@/db'
import { getKindeServerSession } from '@kinde-oss/kinde-auth-nextjs/server'
import { createUploadthing, type FileRouter } from 'uploadthing/next'
// import { BaseReader, Document, Metadata } from 'llamaindex'
// import NLPCloudClient from 'nlpcloud'
import { PDFLoader } from 'langchain/document_loaders/fs/pdf'

import { OpenAIEmbeddings } from 'langchain/embeddings/openai'
import { PineconeStore } from 'langchain/vectorstores/pinecone'
import { getPineconeClient } from '@/lib/pinecone'
import { getUserSubscriptionPlan } from '@/lib/stripe'
import { PLANS } from '@/config/stripe'
const f = createUploadthing()

const middleware = async () => {
  const { getUser } = getKindeServerSession()
  const user = getUser()
  console.log('upload middleware auth', user)
  if (!user || !user.id) throw new Error('UNAUTHORIZED')

  console.log('upload middleware 2')

  const subscriptionPlan = await getUserSubscriptionPlan()
  // Whatever is returned here is accessible in onUploadComplete as `metadata`
  return { subscriptionPlan, userId: user.id }
}

const onUploadComplete = async ({
  metadata,
  file
}: {
  metadata: Awaited<ReturnType<typeof middleware>>
  file: { key: string; name: string; url: string }
}) => {
  // This code RUNS ON YOUR SERVER after upload
  // save url to db
  const isFileExist = await db.file.findFirst({
    where: { key: file.key }
  })

  if (isFileExist) return

  const fileUrl = `https://uploadthing-prod.s3.us-west-2.amazonaws.com/${file.key}`
  const createdFile = await db.file.create({
    data: {
      key: file.key,
      name: file.name,
      userId: metadata.userId,
      // url:file.url,
      url: fileUrl,
      uploadStatus: 'PROCESSING'
    }
  })

  console.log('file uploaded', createdFile)

  try {
    const response = await fetch(`https://uploadthing-prod.s3.us-west-2.amazonaws.com/${file.key}`)

    const blob = await response.blob()

    const loader = new PDFLoader(blob)
    const pageLevelDocs = await loader.load()

    const pagesAmt = pageLevelDocs.length

    console.log('processing pdf', pagesAmt)

    const { subscriptionPlan } = metadata
    const { isSubscribed } = subscriptionPlan

    const isProExceeded = pagesAmt > PLANS.find(plan => plan.name === 'Pro')!.pagesPerPdf
    const isFreeExceeded = pagesAmt > PLANS.find(plan => plan.name === 'Free')!.pagesPerPdf

    if ((isSubscribed && isProExceeded) || (!isSubscribed && isFreeExceeded)) {
      return await db.file.update({
        where: {
          id: createdFile.id
        },
        data: {
          uploadStatus: 'FAILED'
        }
      })
    }

    // vectorize and index entire document
    const pinecone = getPineconeClient()
    const pineconeIndex = pinecone.Index('quill')
    // const nlpCloud = new NLPCloudClient({model :'paraphrase-multilingual-mpnet-base-v2',token:process.env.NLPCLOUD_API_KEY!})

    // nlpCloud.embeddings({sentences:pageLevelDocs}).then(function (response) {
    //   console.log(response.data);
    // })
    // .catch(function (err) {
    //   console.error(err.response.status);
    //   console.error(err.response.data.detail);
    // });

    const embeddings = new OpenAIEmbeddings({
      //   openAIApiKey: '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'
      openAIApiKey: process.env.OPENAI_API_KEY
    })
    console.log('pine result 1')

    const pinestore = await PineconeStore.fromDocuments(pageLevelDocs, embeddings, {
      pineconeIndex
      // namespace: createdFile.id,
    })
    console.log('pine result 2')
    //-----using llamaindex AI/LLM
    //
    // const loader = new URLPDFReader()
    // const document = await loader.loadData(fileUrl)

    // // Split text and create embeddings. Store them in a VectorStoreIndex
    // const index = await VectorStoreIndex.fromDocuments(document)

    // // Query the index
    // const queryEngine = index.asQueryEngine()
    // const response = await queryEngine.query('What did the author do in college?')

    // // Output response
    // console.log(response.toString())
    //
    //-----end using llamaindex AI/LLM

    await db.file.update({
      data: {
        uploadStatus: 'SUCCESS'
      },
      where: {
        id: createdFile.id
      }
    })
  } catch (error) {
    console.log('error FAILED', error)
    await db.file.update({
      data: {
        uploadStatus: 'FAILED'
      },
      where: {
        id: createdFile.id
      }
    })
  }
}

// FileRouter for your app, can contain multiple FileRoutes
export const ourFileRouter = {
  // Define as many FileRoutes as you like, each with a unique routeSlug
  freePlanUploader: f({ pdf: { maxFileSize: '4MB' } })
    // Set permissions and file types for this FileRoute
    .middleware(middleware)
    .onUploadError(error => {
      console.log('error uploading', error)
    })
    .onUploadComplete(onUploadComplete),
  proPlanUploader: f({ pdf: { maxFileSize: '16MB' } })
    // Set permissions and file types for this FileRoute
    .middleware(middleware)
    .onUploadError(error => {
      console.log('error uploading', error)
    })
    .onUploadComplete(onUploadComplete)
} satisfies FileRouter

export type OurFileRouter = typeof ourFileRouter
