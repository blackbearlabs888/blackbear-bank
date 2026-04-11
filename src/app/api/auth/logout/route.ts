import { NextResponse } from 'next/server'
import { ApiResponse } from '@/types'

export async function POST() {
  try {
    // Create response
    const response = NextResponse.json<ApiResponse>({
      success: true,
      message: 'Logout successful'
    }, { status: 200 })

    // Clear token cookie
    response.cookies.set('token', '', {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0,
      path: '/'
    })

    // Clear zustand persist cookie
    response.cookies.set('blackbear-auth', '', {
      maxAge: 0,
      path: '/'
    })

    return response

  } catch (error) {
    console.error('Logout error:', error)
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}
