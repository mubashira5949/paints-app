/**
 * authorizeRole.ts
 * Fastify preHandler middleware for Role-Based Access Control (RBAC).
 * Ensures the authenticated user possesses one of the permitted roles.
 */

import { FastifyReply, FastifyRequest } from 'fastify'

/**
 * Middleware to authorize users based on their role.
 * Assumes that `request.user` is populated by JWT authentication.
 * 
 * @param allowedRoles - An array of roles that are allowed to access the route.
 * @returns A Fastify preHandler hook.
 */
export const authorizeRole = (allowedRoles: string[]) => {
    return async (request: FastifyRequest, reply: FastifyReply) => {
        const user = (request as any).user as { role?: string } | undefined

        // If no user or role is found, deny access.
        if (!user || !user.role) {
            return reply.status(403).send({
                error: 'Forbidden',
                message: 'No role found for user'
            })
        }

        // Check if the user's role is in the list of allowed roles.
        if (!allowedRoles.includes(user.role)) {
            return reply.status(403).send({
                error: 'Forbidden',
                message: `User role '${user.role}' is not authorized to access this resource`
            })
        }
    }
}
