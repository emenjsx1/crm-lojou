import axios from 'axios'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const url = query.url as string
  const apiKey = query.key as string

  if (!url || !apiKey) {
    throw createError({ statusCode: 400, message: 'URL ou Key ausente' })
  }

  try {
    const response = await axios.get(url, {
      headers: { 'apikey': apiKey },
      responseType: 'arraybuffer'
    })

    const contentType = response.headers['content-type']
    setResponseHeader(event, 'Content-Type', contentType)
    
    return response.data
  } catch (err: any) {
    console.error('[MEDIA PROXY ERROR]', err.message)
    throw createError({ statusCode: 500, message: 'Erro ao carregar mídia' })
  }
})
