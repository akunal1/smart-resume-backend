import fs from 'fs'
import path from 'path'

interface Resume {
  profile: {
    full_name: string
    current_titles: string[]
    summary: string
    location?: {
      city: string
      state: string
      country: string
      postal_code?: string
      area?: string
    }
    contact?: {
      phone?: string
      email?: string
      links?: {
        linkedin?: string
        github?: string
        website?: string
      }
    }
  }
  skills: {
    primary: string[]
    secondary: string[]
    domains: string[]
    tools_platforms: string[]
  }
  work_history: Array<{
    company: string
    role?: string
    location?: string
    start_date?: string
    end_date?: string | null
    employment_type?: string
    highlights?: string[]
    tech_stack?: string[]
    roles?: Array<{
      title: string
      location: string
      start_date: string
      end_date: string
      responsibilities: string[]
    }>
  }>
  projects: Array<{
    name: string
    organization: string
    domain: string
    type: string
    tech_stack: string[]
    features: string[]
    contributions?: string[]
    location: string
    period: string
  }>
  education: Array<{
    degree: string
    discipline: string
    institution: string
    location: string
    start_year: number
    end_year: number
  }>
  certifications: string[]
  awards_recognition: string[]
  most_proud_of: string[]
}

let resumeCache: Resume | null = null

const loadResume = (): Resume => {
  if (resumeCache) return resumeCache

  const resumePath = path.join(process.cwd(), 'data/resume.json')
  const resumeData = fs.readFileSync(resumePath, 'utf-8')
  resumeCache = JSON.parse(resumeData)
  return resumeCache!
}

export const getResumeContext = (query: string): string => {
  const resume = loadResume()

  // Check if this is a career-related question
  const careerKeywords = [
    'experience',
    'work',
    'job',
    'career',
    'role',
    'skill',
    'technology',
    'tech',
    'programming',
    'project',
    'education',
    'degree',
    'background',
    'qualification',
    'expertise',
    'specialize',
    'avinash',
    'nayak',
    'professional',
    'resume',
    'cv',
    'portfolio',
    'achievement',
    'certification',
  ]

  const isCareerRelated = careerKeywords.some((keyword) =>
    query.toLowerCase().includes(keyword)
  )

  // If not career-related, return minimal context
  if (!isCareerRelated) {
    return `Summary: ${resume.profile.summary}`
  }

  // For career-related questions, return comprehensive context
  let context = `Name: ${resume.profile.full_name}\n`
  context += `Titles: ${resume.profile.current_titles.join(', ')}\n`
  context += `Summary: ${resume.profile.summary}\n\n`

  context += `Skills:\n`
  context += `Primary: ${resume.skills.primary.join(', ')}\n`
  context += `Secondary: ${resume.skills.secondary.join(', ')}\n`
  context += `Domains: ${resume.skills.domains.join(', ')}\n`
  context += `Tools/Platforms: ${resume.skills.tools_platforms.join(', ')}\n\n`

  context += `Work Experience:\n`
  resume.work_history.forEach((exp) => {
    if (exp.roles) {
      // Handle Infosys-style entries with roles array
      exp.roles.forEach((role) => {
        context += `${role.title} at ${exp.company} (${role.start_date} - ${role.end_date})\n`
        context += `Location: ${role.location}\n`
        context += `Responsibilities: ${role.responsibilities.join(', ')}\n\n`
      })
    } else {
      // Handle AGCO-style entries with direct highlights
      context += `${exp.role} at ${exp.company} (${exp.start_date} - ${exp.end_date || 'Present'})\n`
      context += `Location: ${exp.location}\n`
      if (exp.highlights) {
        context += `Highlights: ${exp.highlights.join(', ')}\n`
      }
      if (exp.tech_stack) {
        context += `Tech Stack: ${exp.tech_stack.join(', ')}\n\n`
      }
    }
  })

  context += `Projects:\n`
  resume.projects.forEach((proj) => {
    context += `${proj.name} (${proj.organization})\n`
    context += `Domain: ${proj.domain}\n`
    context += `Type: ${proj.type}\n`
    context += `Tech Stack: ${proj.tech_stack.join(', ')}\n`
    context += `Features: ${proj.features.join(', ')}\n`
    if (proj.contributions) {
      context += `Contributions: ${proj.contributions.join(', ')}\n`
    }
    context += `Period: ${proj.period}\n\n`
  })

  context += `Education:\n`
  resume.education.forEach((edu) => {
    context += `${edu.degree} in ${edu.discipline}\n`
    context += `${edu.institution}, ${edu.location}\n`
    context += `Years: ${edu.start_year} - ${edu.end_year}\n\n`
  })

  if (resume.certifications && resume.certifications.length > 0) {
    context += `Certifications: ${resume.certifications.join(', ')}\n\n`
  }

  if (resume.awards_recognition && resume.awards_recognition.length > 0) {
    context += `Awards & Recognition: ${resume.awards_recognition.join(', ')}\n\n`
  }

  if (resume.most_proud_of && resume.most_proud_of.length > 0) {
    context += `Most Proud Of: ${resume.most_proud_of.join(', ')}\n\n`
  }

  return context.trim()
}

// New function to get complete resume context for system prompt
export const getCompleteResumeContext = (): string => {
  const resume = loadResume()

  let context = `COMPLETE RESUME DATA FOR AVINASH NAYAK:\n\n`

  context += `PROFILE:\n`
  context += `Name: ${resume.profile.full_name}\n`
  context += `Current Titles: ${resume.profile.current_titles.join(', ')}\n`
  context += `Summary: ${resume.profile.summary}\n`
  if (resume.profile.location) {
    context += `Location: ${resume.profile.location.city}, ${resume.profile.location.state}, ${resume.profile.location.country}\n`
  }

  // Include contact details
  if (resume.profile.contact) {
    context += `Contact Information:\n`
    if (resume.profile.contact.phone)
      context += `Phone: ${resume.profile.contact.phone}\n`
    if (resume.profile.contact.email)
      context += `Email: ${resume.profile.contact.email}\n`
    if (resume.profile.contact.links) {
      if (resume.profile.contact.links.linkedin)
        context += `LinkedIn: ${resume.profile.contact.links.linkedin}\n`
      if (resume.profile.contact.links.github)
        context += `GitHub: ${resume.profile.contact.links.github}\n`
      if (resume.profile.contact.links.website)
        context += `Website: ${resume.profile.contact.links.website}\n`
    }
  }
  context += `\n`

  context += `SKILLS:\n`
  context += `Primary Skills: ${resume.skills.primary.join(', ')}\n`
  context += `Secondary Skills: ${resume.skills.secondary.join(', ')}\n`
  context += `Domains: ${resume.skills.domains.join(', ')}\n`
  context += `Tools & Platforms: ${resume.skills.tools_platforms.join(', ')}\n\n`

  context += `WORK EXPERIENCE:\n`
  resume.work_history.forEach((exp, index) => {
    context += `${index + 1}. ${exp.company}\n`
    if (exp.roles) {
      // Handle Infosys-style entries with roles array
      exp.roles.forEach((role) => {
        context += `   Role: ${role.title}\n`
        context += `   Duration: ${role.start_date} - ${role.end_date}\n`
        context += `   Location: ${role.location}\n`
        context += `   Responsibilities: ${role.responsibilities.join(', ')}\n`
      })
    } else {
      // Handle AGCO-style entries with direct highlights
      context += `   Role: ${exp.role}\n`
      context += `   Duration: ${exp.start_date} - ${exp.end_date || 'Present'}\n`
      context += `   Location: ${exp.location}\n`
      if (exp.highlights) {
        context += `   Highlights: ${exp.highlights.join(', ')}\n`
      }
      if (exp.tech_stack) {
        context += `   Tech Stack: ${exp.tech_stack.join(', ')}\n`
      }
    }
    context += `\n`
  })

  context += `PROJECTS:\n`
  resume.projects.forEach((proj, index) => {
    context += `${index + 1}. ${proj.name}\n`
    context += `   Organization: ${proj.organization}\n`
    context += `   Domain: ${proj.domain}\n`
    context += `   Type: ${proj.type}\n`
    context += `   Tech Stack: ${proj.tech_stack.join(', ')}\n`
    context += `   Features: ${proj.features.join(', ')}\n`
    if (proj.contributions) {
      context += `   Contributions: ${proj.contributions.join(', ')}\n`
    }
    context += `   Location: ${proj.location}\n`
    context += `   Period: ${proj.period}\n\n`
  })

  context += `EDUCATION:\n`
  resume.education.forEach((edu, index) => {
    context += `${index + 1}. ${edu.degree} in ${edu.discipline}\n`
    context += `   Institution: ${edu.institution}\n`
    context += `   Location: ${edu.location}\n`
    context += `   Duration: ${edu.start_year} - ${edu.end_year}\n\n`
  })

  if (resume.certifications && resume.certifications.length > 0) {
    context += `CERTIFICATIONS:\n${resume.certifications.join(', ')}\n\n`
  }

  if (resume.awards_recognition && resume.awards_recognition.length > 0) {
    context += `AWARDS & RECOGNITION:\n${resume.awards_recognition.join(', ')}\n\n`
  }

  if (resume.most_proud_of && resume.most_proud_of.length > 0) {
    context += `MOST PROUD OF:\n${resume.most_proud_of.join(', ')}\n\n`
  }

  return context.trim()
}

// Function to check if a query can be answered using resume data
export const canAnswerFromResume = (query: string): boolean => {
  const resume = loadResume()
  const lowerQuery = query.toLowerCase()

  // Keywords that indicate career/professional questions
  const careerKeywords = [
    'experience',
    'work',
    'job',
    'career',
    'professional',
    'skill',
    'technology',
    'tech',
    'project',
    'education',
    'degree',
    'qualification',
    'background',
    'expertise',
    'specialize',
    'avinash',
    'nayak',
    'resume',
    'cv',
    'portfolio',
    'achievement',
    'certification',
    'company',
    'role',
    'position',
    'responsibility',
    'task',
    'accomplishment',
    'award',
    'recognition',
    'contact',
    'email',
    'phone',
    'linkedin',
    'github',
    'website',
    'location',
    'address',
    'summary',
    'profile',
    'bio',
    'introduction',
    'about',
    'background',
    'history',
    'timeline',
    'journey',
    'download resume',
    'download cv',
    'get resume',
    'send resume',
    'resume pdf',
    'cv pdf',
    'can i download',
    'your resume',
    'resume',
    'cv',
    'curriculum vitae',
    'my resume',
    'give me resume',
    'can i have resume',
    'i want resume',
    'show me resume',
    'share resume',
    'can you give me',
    'can you send me',
  ]

  // Check if query contains career-related keywords
  const hasCareerKeywords = careerKeywords.some((keyword) =>
    lowerQuery.includes(keyword)
  )

  // Allow general conversational queries and greetings
  const conversationalKeywords = [
    'hello',
    'hi',
    'hey',
    'good morning',
    'good afternoon',
    'good evening',
    'how are you',
    'how do you do',
    'nice to meet you',
    'pleased to meet you',
    'thank you',
    'thanks',
    'welcome',
    'bye',
    'goodbye',
    'see you',
    'talk to you later',
    'have a good day',
    'have a nice day',
    'how is it going',
    "what's up",
    'how have you been',
    'long time no see',
    "it's been a while",
    'how are things',
    'how is everything',
    'what are you up to',
    'how is your day',
    'how was your day',
    'how is your week',
    'how was your weekend',
    'are you doing well',
    'i hope you are well',
    "i hope you're doing well",
  ]

  const hasConversationalKeywords = conversationalKeywords.some((keyword) =>
    lowerQuery.includes(keyword)
  )

  // Check for specific questions about resume data
  const specificQuestions = [
    'what do you do',
    'what is your job',
    'what are you',
    'tell me about yourself',
    'what are your skills',
    'what technologies',
    'what languages do you know',
    'where do you work',
    'where have you worked',
    'what companies',
    'what is your education',
    'where did you study',
    'what degree',
    'how can i contact',
    'what is your email',
    'what is your phone',
    'what is your linkedin',
    'what is your github',
    'what is your website',
    'where are you located',
    'where do you live',
    'what city',
    'what country',
  ]

  const hasSpecificQuestions = specificQuestions.some((question) =>
    lowerQuery.includes(question.toLowerCase())
  )

  // Check for questions about specific companies/projects mentioned in resume
  const resumeCompanies = resume.work_history.map((exp) =>
    exp.company.toLowerCase()
  )
  const resumeProjects = resume.projects.map((proj) => proj.name.toLowerCase())
  const resumeSkills = [
    ...resume.skills.primary,
    ...resume.skills.secondary,
    ...resume.skills.domains,
  ].map((skill) => skill.toLowerCase())

  const hasResumeSpecificTerms = [
    ...resumeCompanies,
    ...resumeProjects,
    ...resumeSkills,
  ].some((term) => lowerQuery.includes(term))

  // Explicitly reject geographical/general knowledge questions
  const rejectKeywords = [
    'how far',
    'mountain',
    'everest',
    'president',
    'capital',
    'ocean',
    'river',
    'continent',
    'weather',
    'temperature',
    'population',
    'currency',
    'language of',
    'time zone',
  ]

  const hasRejectKeywords = rejectKeywords.some((keyword) =>
    lowerQuery.includes(keyword)
  )

  // If it has reject keywords and no career keywords, reject it
  if (hasRejectKeywords && !hasCareerKeywords) {
    return false
  }

  return (
    hasCareerKeywords ||
    hasSpecificQuestions ||
    hasResumeSpecificTerms ||
    hasConversationalKeywords
  )
}

// Function to get filtered resume context based on query relevance
export const getFilteredResumeContext = (query: string): string => {
  // Always provide complete resume context and let AI decide what to answer
  return getCompleteResumeContext()
}
