import { createServer } from 'http'
import { Server, Socket } from 'socket.io'

// Types
interface OwnerSession {
  id: string
  userId: string
  socketId: string
  connectedAt: Date
}

interface PartnerSession {
  id: string
  partnerId: string
  userId: string
  socketId: string
  connectedAt: Date
}

interface NewOrderPayload {
  id: string
  orderId: string
  nominal: number
  customerName: string
  partnerName?: string
  createdAt: string
}

interface OrderUpdatePayload {
  orderId: string
  status: string
  updatedAt: string
}

interface PartnerNotificationPayload {
  id: string
  orderId: string
  notes: string
  status: string
  partner: {
    name: string
  }
  customer: {
    name: string
    phone: string
  }
  updatedAt: string
}

// In-memory sessions
const ownerSessions = new Map<string, OwnerSession>()
const partnerSessions = new Map<string, PartnerSession>()

let io: Server | null = null

export function getIO(): Server | null {
  return io
}

export function initSocketServer(httpServer?: ReturnType<typeof createServer>): Server {
  if (io) {
    return io
  }

  // Create HTTP server if not provided
  const server = httpServer || createServer()
  
  io = new Server(server, {
    path: '/',
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    },
    pingTimeout: 60000,
    pingInterval: 25000,
  })

  // Connection handling
  io.on('connection', (socket: Socket) => {
    console.log(`[Socket] Client connected: ${socket.id}`)

    // Owner joins
    socket.on('join-owner', (data: { userId: string }) => {
      const { userId } = data
      
      // Join owner room
      socket.join('owners')
      
      // Store session
      const session: OwnerSession = {
        id: socket.id,
        userId,
        socketId: socket.id,
        connectedAt: new Date()
      }
      ownerSessions.set(socket.id, session)
      
      console.log(`[Socket] Owner joined: ${userId} (${socket.id})`)
      
      // Send acknowledgment
      socket.emit('joined-owner', { 
        success: true, 
        socketId: socket.id,
        timestamp: new Date().toISOString()
      })
    })

    // Partner joins
    socket.on('join-partner', (data: { partnerId: string; userId: string }) => {
      const { partnerId, userId } = data
      
      // Join partner-specific room
      socket.join(`partner-${partnerId}`)
      socket.join('partners')
      
      // Store session
      const session: PartnerSession = {
        id: socket.id,
        partnerId,
        userId,
        socketId: socket.id,
        connectedAt: new Date()
      }
      partnerSessions.set(socket.id, session)
      
      console.log(`[Socket] Partner joined: ${partnerId} (${socket.id})`)
      
      // Send acknowledgment
      socket.emit('joined-partner', { 
        success: true, 
        socketId: socket.id,
        timestamp: new Date().toISOString()
      })
    })

    // New order notification (broadcast to owners)
    socket.on('new-order', (data: NewOrderPayload) => {
      console.log(`[Socket] New order: ${data.orderId}`)
      
      // Broadcast to all owners
      io?.to('owners').emit('new-order', {
        ...data,
        isNew: true,
        createdAt: data.createdAt || new Date().toISOString()
      })
    })

    // Order status update
    socket.on('order-updated', (data: OrderUpdatePayload) => {
      console.log(`[Socket] Order updated: ${data.orderId} -> ${data.status}`)
      
      // Broadcast to all owners and partners
      io?.emit('order-updated', {
        ...data,
        updatedAt: data.updatedAt || new Date().toISOString()
      })
    })

    // Partner notification to owner
    socket.on('partner-notification', (data: PartnerNotificationPayload) => {
      console.log(`[Socket] Partner notification from: ${data.partner?.name}`)
      
      // Broadcast to all owners
      io?.to('owners').emit('partner-notification', {
        ...data,
        updatedAt: data.updatedAt || new Date().toISOString()
      })
    })

    // Transaction created
    socket.on('transaction-created', (data: { transactionId: string; partnerId?: string }) => {
      console.log(`[Socket] Transaction created: ${data.transactionId}`)
      
      // Notify specific partner if assigned
      if (data.partnerId) {
        io?.to(`partner-${data.partnerId}`).emit('new-transaction', data)
      }
      
      // Also notify owners
      io?.to('owners').emit('new-transaction', data)
    })

    // Test event
    socket.on('test', (data) => {
      console.log('[Socket] Test received:', data)
      socket.emit('test-response', {
        message: 'Server received test message',
        data: data,
        timestamp: new Date().toISOString()
      })
    })

    // Disconnect handling
    socket.on('disconnect', () => {
      // Remove from sessions
      if (ownerSessions.has(socket.id)) {
        ownerSessions.delete(socket.id)
        console.log(`[Socket] Owner disconnected: ${socket.id}`)
      }
      
      if (partnerSessions.has(socket.id)) {
        partnerSessions.delete(socket.id)
        console.log(`[Socket] Partner disconnected: ${socket.id}`)
      }
    })

    // Error handling
    socket.on('error', (error) => {
      console.error(`[Socket] Error (${socket.id}):`, error)
    })
  })

  // Start server on port 3003
  const PORT = 3003
  server.listen(PORT, () => {
    console.log(`[Socket] WebSocket server running on port ${PORT}`)
  })

  // Graceful shutdown
  process.on('SIGTERM', () => {
    console.log('[Socket] Received SIGTERM signal, shutting down...')
    server.close(() => {
      console.log('[Socket] Server closed')
      process.exit(0)
    })
  })

  process.on('SIGINT', () => {
    console.log('[Socket] Received SIGINT signal, shutting down...')
    server.close(() => {
      console.log('[Socket] Server closed')
      process.exit(0)
    })
  })

  return io
}

// Helper functions to emit events from other parts of the app
export function emitNewOrder(data: NewOrderPayload) {
  if (io) {
    io.to('owners').emit('new-order', {
      ...data,
      isNew: true,
      createdAt: data.createdAt || new Date().toISOString()
    })
  }
}

export function emitOrderUpdate(data: OrderUpdatePayload) {
  if (io) {
    io.emit('order-updated', {
      ...data,
      updatedAt: data.updatedAt || new Date().toISOString()
    })
  }
}

export function emitPartnerNotification(data: PartnerNotificationPayload) {
  if (io) {
    io.to('owners').emit('partner-notification', {
      ...data,
      updatedAt: data.updatedAt || new Date().toISOString()
    })
  }
}

export function emitToPartner(partnerId: string, event: string, data: unknown) {
  if (io) {
    io.to(`partner-${partnerId}`).emit(event, data)
  }
}

export function getConnectedOwners(): OwnerSession[] {
  return Array.from(ownerSessions.values())
}

export function getConnectedPartners(): PartnerSession[] {
  return Array.from(partnerSessions.values())
}

// Initialize on import (optional - can be called manually)
if (typeof window === 'undefined' && process.env.NODE_ENV !== 'test') {
  // Only initialize on server side
  try {
    initSocketServer()
  } catch (error) {
    console.log('[Socket] Server already initialized or error:', error)
  }
}
