import { Router } from 'express'
import { askAssistant } from '../controllers/assistant.controller'

const router: Router = Router()

router.post('/ask', askAssistant)

// Route to download resume PDF
router.get('/download', (req, res) => {
  const resumePath =
    '/Users/avinash.nayak/agco_Projects/exp-hub/ai-voice/apps/server/data/Avinash_Nayak.pdf'

  res.download(resumePath, 'Avinash_Nayak_Resume.pdf', (err) => {
    if (err) {
      console.error('Error downloading resume:', err)
      res.status(500).json({ error: 'Failed to download resume' })
    }
  })
})

export default router
