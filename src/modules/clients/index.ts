/**
 * Clients Module
 * Full CRUD for client/customer onboarding, including multiple shipping addresses.
 */

import { FastifyInstance } from 'fastify'
import { TypeBoxTypeProvider } from '@fastify/type-provider-typebox'
import { Type } from '@sinclair/typebox'
import { authorizeRole } from '../../utils/authorizeRole'

export default async function (fastifyRaw: FastifyInstance) {
    const fastify = fastifyRaw.withTypeProvider<TypeBoxTypeProvider>()
    const ALLOWED = ['admin', 'manager', 'sales']

    // -------------------------------------------------------------------------
    // GET /clients — list all clients with their shipping addresses
    // -------------------------------------------------------------------------
    fastify.get('/', {
        preHandler: [fastify.authenticate, authorizeRole(ALLOWED)],
        handler: async (_request, reply) => {
            try {
                const result = await fastify.db.query(`
                    SELECT
                        c.id, c.name, c.gst_number, c.contact_name,
                        c.contact_phone, c.contact_email, c.billing_address,
                        c.created_at, c.updated_at,
                        u.username AS onboarded_by,
                        COALESCE(
                            json_agg(
                                json_build_object(
                                    'id',         a.id,
                                    'label',      a.label,
                                    'address',    a.address,
                                    'is_default', a.is_default
                                ) ORDER BY a.is_default DESC, a.id ASC
                            ) FILTER (WHERE a.id IS NOT NULL),
                            '[]'
                        ) AS shipping_addresses
                    FROM clients c
                    LEFT JOIN users u ON c.created_by = u.id
                    LEFT JOIN client_shipping_addresses a ON c.id = a.client_id
                    GROUP BY c.id, u.username
                    ORDER BY c.name ASC
                `)
                return reply.send(result.rows)
            } catch (err) {
                fastify.log.error(err)
                return reply.status(500).send({ error: 'Internal Server Error', message: 'Failed to retrieve clients' })
            }
        }
    })

    // -------------------------------------------------------------------------
    // GET /clients/:id — single client with all addresses
    // -------------------------------------------------------------------------
    fastify.get('/:id', {
        preHandler: [fastify.authenticate, authorizeRole(ALLOWED)],
        handler: async (request, reply) => {
            const { id } = request.params as { id: string }
            try {
                const result = await fastify.db.query(`
                    SELECT
                        c.id, c.name, c.gst_number, c.contact_name,
                        c.contact_phone, c.contact_email, c.billing_address,
                        c.created_at, c.updated_at,
                        u.username AS onboarded_by,
                        COALESCE(
                            json_agg(
                                json_build_object(
                                    'id',         a.id,
                                    'label',      a.label,
                                    'address',    a.address,
                                    'is_default', a.is_default
                                ) ORDER BY a.is_default DESC, a.id ASC
                            ) FILTER (WHERE a.id IS NOT NULL),
                            '[]'
                        ) AS shipping_addresses
                    FROM clients c
                    LEFT JOIN users u ON c.created_by = u.id
                    LEFT JOIN client_shipping_addresses a ON c.id = a.client_id
                    WHERE c.id = $1
                    GROUP BY c.id, u.username
                `, [id])

                if (result.rows.length === 0) {
                    return reply.status(404).send({ error: 'Not Found', message: 'Client not found' })
                }
                return reply.send(result.rows[0])
            } catch (err) {
                fastify.log.error(err)
                return reply.status(500).send({ error: 'Internal Server Error', message: 'Failed to retrieve client' })
            }
        }
    })

    // -------------------------------------------------------------------------
    // POST /clients — onboard a new client
    // -------------------------------------------------------------------------
    const CreateClientSchema = Type.Object({
        name:            Type.String({ minLength: 1 }),
        gstNumber:       Type.Optional(Type.String()),
        contactName:     Type.Optional(Type.String()),
        contactPhone:    Type.Optional(Type.String()),
        contactEmail:    Type.Optional(Type.String()),
        billingAddress:  Type.Optional(Type.String()),
        shippingAddresses: Type.Optional(Type.Array(Type.Object({
            label:     Type.String({ minLength: 1 }),
            address:   Type.String({ minLength: 1 }),
            isDefault: Type.Optional(Type.Boolean()),
        }))),
    })

    fastify.post('/', {
        preHandler: [fastify.authenticate, authorizeRole(ALLOWED)],
        schema: { body: CreateClientSchema },
        handler: async (request, reply) => {
            const user = (request as any).user as { id: number }
            const { name, gstNumber, contactName, contactPhone, contactEmail, billingAddress, shippingAddresses } = request.body
            let client
            try {
                client = await fastify.db.connect()
                await client.query('BEGIN')

                const res = await client.query(
                    `INSERT INTO clients (name, gst_number, contact_name, contact_phone, contact_email, billing_address, created_by)
                     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
                    [name, gstNumber || null, contactName || null, contactPhone || null, contactEmail || null, billingAddress || null, user.id]
                )
                const clientId = res.rows[0].id

                if (shippingAddresses && shippingAddresses.length > 0) {
                    for (const addr of shippingAddresses) {
                        await client.query(
                            `INSERT INTO client_shipping_addresses (client_id, label, address, is_default)
                             VALUES ($1, $2, $3, $4)`,
                            [clientId, addr.label, addr.address, addr.isDefault ?? false]
                        )
                    }
                }

                await client.query('COMMIT')
                return reply.status(201).send({ id: clientId, message: 'Client onboarded successfully' })
            } catch (err: any) {
                if (client) await client.query('ROLLBACK')
                fastify.log.error(err)
                if (err.code === '23505') { // unique_violation on gst_number
                    return reply.status(409).send({ error: 'Conflict', message: 'A client with this GST number already exists' })
                }
                return reply.status(500).send({ error: 'Internal Server Error', message: 'Failed to onboard client' })
            } finally {
                if (client) client.release()
            }
        }
    })

    // -------------------------------------------------------------------------
    // PUT /clients/:id — update client details
    // -------------------------------------------------------------------------
    const UpdateClientSchema = Type.Object({
        name:           Type.Optional(Type.String({ minLength: 1 })),
        gstNumber:      Type.Optional(Type.String()),
        contactName:    Type.Optional(Type.String()),
        contactPhone:   Type.Optional(Type.String()),
        contactEmail:   Type.Optional(Type.String()),
        billingAddress: Type.Optional(Type.String()),
    })

    fastify.put('/:id', {
        preHandler: [fastify.authenticate, authorizeRole(ALLOWED)],
        schema: { body: UpdateClientSchema },
        handler: async (request, reply) => {
            const { id } = request.params as { id: string }
            const { name, gstNumber, contactName, contactPhone, contactEmail, billingAddress } = request.body
            try {
                const result = await fastify.db.query(
                    `UPDATE clients SET
                        name           = COALESCE($1, name),
                        gst_number     = COALESCE($2, gst_number),
                        contact_name   = COALESCE($3, contact_name),
                        contact_phone  = COALESCE($4, contact_phone),
                        contact_email  = COALESCE($5, contact_email),
                        billing_address = COALESCE($6, billing_address),
                        updated_at     = CURRENT_TIMESTAMP
                     WHERE id = $7 RETURNING id`,
                    [name, gstNumber, contactName, contactPhone, contactEmail, billingAddress, id]
                )
                if (result.rows.length === 0) {
                    return reply.status(404).send({ error: 'Not Found', message: 'Client not found' })
                }
                return reply.send({ message: 'Client updated successfully' })
            } catch (err: any) {
                fastify.log.error(err)
                if (err.code === '23505') {
                    return reply.status(409).send({ error: 'Conflict', message: 'A client with this GST number already exists' })
                }
                return reply.status(500).send({ error: 'Internal Server Error', message: 'Failed to update client' })
            }
        }
    })

    // -------------------------------------------------------------------------
    // POST /clients/:id/addresses — add a shipping address
    // -------------------------------------------------------------------------
    const AddAddressSchema = Type.Object({
        label:     Type.String({ minLength: 1 }),
        address:   Type.String({ minLength: 1 }),
        isDefault: Type.Optional(Type.Boolean()),
    })

    fastify.post('/:id/addresses', {
        preHandler: [fastify.authenticate, authorizeRole(ALLOWED)],
        schema: { body: AddAddressSchema },
        handler: async (request, reply) => {
            const { id } = request.params as { id: string }
            const { label, address, isDefault } = request.body
            let client
            try {
                client = await fastify.db.connect()
                await client.query('BEGIN')

                // If this address is to be the default, clear existing defaults first
                if (isDefault) {
                    await client.query(
                        'UPDATE client_shipping_addresses SET is_default = FALSE WHERE client_id = $1',
                        [id]
                    )
                }

                const res = await client.query(
                    `INSERT INTO client_shipping_addresses (client_id, label, address, is_default)
                     VALUES ($1, $2, $3, $4) RETURNING id`,
                    [id, label, address, isDefault ?? false]
                )
                await client.query('COMMIT')
                return reply.status(201).send({ id: res.rows[0].id, message: 'Address added successfully' })
            } catch (err) {
                if (client) await client.query('ROLLBACK')
                fastify.log.error(err)
                return reply.status(500).send({ error: 'Internal Server Error', message: 'Failed to add address' })
            } finally {
                if (client) client.release()
            }
        }
    })

    // -------------------------------------------------------------------------
    // DELETE /clients/:id/addresses/:addrId — remove a shipping address
    // -------------------------------------------------------------------------
    fastify.delete('/:id/addresses/:addrId', {
        preHandler: [fastify.authenticate, authorizeRole(['admin', 'manager'])],
        handler: async (request, reply) => {
            const { id, addrId } = request.params as { id: string, addrId: string }
            try {
                const result = await fastify.db.query(
                    'DELETE FROM client_shipping_addresses WHERE id = $1 AND client_id = $2 RETURNING id',
                    [addrId, id]
                )
                if (result.rows.length === 0) {
                    return reply.status(404).send({ error: 'Not Found', message: 'Address not found' })
                }
                return reply.send({ message: 'Address removed successfully' })
            } catch (err) {
                fastify.log.error(err)
                return reply.status(500).send({ error: 'Internal Server Error', message: 'Failed to remove address' })
            }
        }
    })
}
