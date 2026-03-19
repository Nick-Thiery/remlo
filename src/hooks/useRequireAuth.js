import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'

export function useRequireAuth() {
  const navigate = useNavigate()
  const [user, setUser]           = useState(null)
  const [authLoading, setAuthLoading] = useState(true)

  useEffect(() => {
    // Resolve the current session once on mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate('/login')
      } else {
        setUser(session.user)
      }
      setAuthLoading(false)
    })

    // Keep in sync if the user signs out in another tab
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        setUser(null)
        navigate('/login')
      } else {
        setUser(session.user)
      }
    })

    return () => subscription.unsubscribe()
  }, [navigate])

  return { user, authLoading }
}
