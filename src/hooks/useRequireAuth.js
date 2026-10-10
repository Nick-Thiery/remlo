import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'
import safeStorage from '../lib/safeStorage.js'

export function useRequireAuth() {
  const navigate = useNavigate()
  const isGuest = safeStorage.getItem('remlo_guest') === 'true'
  const [user, setUser]           = useState(null)
  // A guest has nothing to wait for; a signed-in session is checked below.
  const [authLoading, setAuthLoading] = useState(!isGuest)

  useEffect(() => {
    if (isGuest) return

    // Resolve the current session once on mount
    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        if (!session) {
          navigate('/login')
        } else {
          setUser(session.user)
        }
        setAuthLoading(false)
      })
      .catch(() => {
        navigate('/login')
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
  }, [navigate, isGuest])

  return { user, authLoading, isGuest }
}
