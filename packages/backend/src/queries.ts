/** Types generated for queries found in "packages/backend/sql/queries.sql" */
import { PreparedQuery } from '@pgtyped/runtime';

export type device_status = 'approved' | 'pending' | 'rejected';

export type ink_series = 'LCS' | 'OPQ_JS' | 'STD';

export type order_status = 'approved' | 'cancelled' | 'completed' | 'draft' | 'in_production' | 'pending_approval' | 'ready_for_shipment' | 'shipped';

export type pack_status = 'in_stock' | 'lost' | 'ready_for_shipment' | 'returned' | 'shipped' | 'sold';

export type paint_classification = 'oil_based' | 'water_based';

export type payment_method = 'bank_transfer' | 'card' | 'cash' | 'cheque' | 'other' | 'upi';

export type payment_terms = 'cod' | 'net' | 'prepaid';

export type po_line_kind = 'finished_paint' | 'resource';

export type po_status = 'cancelled' | 'draft' | 'ordered' | 'received' | 'shipped';

export type production_request_status = 'cancelled' | 'completed' | 'in_production' | 'pending';

export type production_run_status = 'cancelled' | 'completed' | 'in_progress' | 'planned';

export type return_condition = 'damaged' | 'expired' | 'good' | 'other';

export type return_disposition = 'lost' | 're_inventory';

export type stash_txn_action = 'added' | 'consumed' | 'manual_adjustment' | 'repackaged';

export type user_role = 'manager' | 'operator' | 'sales';

export type DateOrString = Date | string;

export type NumberOrString = number | string;

export type NumberOrStringArray = (NumberOrString)[];

/** 'GetUserByUsernameOrEmail' parameters type */
export interface IGetUserByUsernameOrEmailParams {
  upn?: string | null | void;
}

/** 'GetUserByUsernameOrEmail' return type */
export interface IGetUserByUsernameOrEmailResult {
  email: string | null;
  id: number;
  password_hash: string | null;
  password_reset_required: boolean;
  role: user_role;
  username: string;
}

/** 'GetUserByUsernameOrEmail' query type */
export interface IGetUserByUsernameOrEmailQuery {
  params: IGetUserByUsernameOrEmailParams;
  result: IGetUserByUsernameOrEmailResult;
}

const getUserByUsernameOrEmailIR: any = {"usedParamSet":{"upn":true},"params":[{"name":"upn","required":false,"transform":{"type":"scalar"},"locs":[{"a":115,"b":118},{"a":148,"b":151}]}],"statement":"SELECT id, username, email, password_hash, role, password_reset_required\n  FROM users\n WHERE (LOWER(email) = LOWER(:upn) OR LOWER(username) = LOWER(:upn))\n   AND is_active = TRUE\n LIMIT 1                                                                                                                                                                                                                                                                                                                                                                   "};

/**
 * Query generated from SQL:
 * ```
 * SELECT id, username, email, password_hash, role, password_reset_required
 *   FROM users
 *  WHERE (LOWER(email) = LOWER(:upn) OR LOWER(username) = LOWER(:upn))
 *    AND is_active = TRUE
 *  LIMIT 1                                                                                                                                                                                                                                                                                                                                                                   
 * ```
 */
export const getUserByUsernameOrEmail = new PreparedQuery<IGetUserByUsernameOrEmailParams,IGetUserByUsernameOrEmailResult>(getUserByUsernameOrEmailIR);


/** 'SetUserPasswordIfReset' parameters type */
export interface ISetUserPasswordIfResetParams {
  id: number;
  password_hash: string;
}

/** 'SetUserPasswordIfReset' return type */
export interface ISetUserPasswordIfResetResult {
  id: number;
}

/** 'SetUserPasswordIfReset' query type */
export interface ISetUserPasswordIfResetQuery {
  params: ISetUserPasswordIfResetParams;
  result: ISetUserPasswordIfResetResult;
}

const setUserPasswordIfResetIR: any = {"usedParamSet":{"password_hash":true,"id":true},"params":[{"name":"password_hash","required":true,"transform":{"type":"scalar"},"locs":[{"a":36,"b":50}]},{"name":"id","required":true,"transform":{"type":"scalar"},"locs":[{"a":143,"b":146}]}],"statement":"UPDATE users\n   SET password_hash = :password_hash!,\n       password_reset_required = false,\n       updated_at = CURRENT_TIMESTAMP\n WHERE id = :id!\n   AND is_active = TRUE\n   AND (password_hash IS NULL OR password_reset_required = TRUE)\n RETURNING id"};

/**
 * Query generated from SQL:
 * ```
 * UPDATE users
 *    SET password_hash = :password_hash!,
 *        password_reset_required = false,
 *        updated_at = CURRENT_TIMESTAMP
 *  WHERE id = :id!
 *    AND is_active = TRUE
 *    AND (password_hash IS NULL OR password_reset_required = TRUE)
 *  RETURNING id
 * ```
 */
export const setUserPasswordIfReset = new PreparedQuery<ISetUserPasswordIfResetParams,ISetUserPasswordIfResetResult>(setUserPasswordIfResetIR);


/** 'ResetUserPassword' parameters type */
export interface IResetUserPasswordParams {
  id: number;
}

/** 'ResetUserPassword' return type */
export interface IResetUserPasswordResult {
  id: number;
  username: string;
}

/** 'ResetUserPassword' query type */
export interface IResetUserPasswordQuery {
  params: IResetUserPasswordParams;
  result: IResetUserPasswordResult;
}

const resetUserPasswordIR: any = {"usedParamSet":{"id":true},"params":[{"name":"id","required":true,"transform":{"type":"scalar"},"locs":[{"a":131,"b":134}]}],"statement":"UPDATE users\n   SET password_hash = NULL,\n       password_reset_required = TRUE,\n       updated_at = CURRENT_TIMESTAMP\n WHERE id = :id!\n RETURNING id, username"};

/**
 * Query generated from SQL:
 * ```
 * UPDATE users
 *    SET password_hash = NULL,
 *        password_reset_required = TRUE,
 *        updated_at = CURRENT_TIMESTAMP
 *  WHERE id = :id!
 *  RETURNING id, username
 * ```
 */
export const resetUserPassword = new PreparedQuery<IResetUserPasswordParams,IResetUserPasswordResult>(resetUserPasswordIR);


/** 'GetDeviceStatus' parameters type */
export interface IGetDeviceStatusParams {
  client_id: string;
  user_id: number;
}

/** 'GetDeviceStatus' return type */
export interface IGetDeviceStatusResult {
  status: device_status;
}

/** 'GetDeviceStatus' query type */
export interface IGetDeviceStatusQuery {
  params: IGetDeviceStatusParams;
  result: IGetDeviceStatusResult;
}

const getDeviceStatusIR: any = {"usedParamSet":{"user_id":true,"client_id":true},"params":[{"name":"user_id","required":true,"transform":{"type":"scalar"},"locs":[{"a":48,"b":56}]},{"name":"client_id","required":true,"transform":{"type":"scalar"},"locs":[{"a":74,"b":84}]}],"statement":"SELECT status FROM user_devices WHERE user_id = :user_id! AND client_id = :client_id!"};

/**
 * Query generated from SQL:
 * ```
 * SELECT status FROM user_devices WHERE user_id = :user_id! AND client_id = :client_id!
 * ```
 */
export const getDeviceStatus = new PreparedQuery<IGetDeviceStatusParams,IGetDeviceStatusResult>(getDeviceStatusIR);


/** 'InsertPendingDevice' parameters type */
export interface IInsertPendingDeviceParams {
  client_id: string;
  label?: string | null | void;
  last_seen_ip?: string | null | void;
  user_agent?: string | null | void;
  user_id: number;
}

/** 'InsertPendingDevice' return type */
export type IInsertPendingDeviceResult = void;

/** 'InsertPendingDevice' query type */
export interface IInsertPendingDeviceQuery {
  params: IInsertPendingDeviceParams;
  result: IInsertPendingDeviceResult;
}

const insertPendingDeviceIR: any = {"usedParamSet":{"user_id":true,"client_id":true,"label":true,"user_agent":true,"last_seen_ip":true},"params":[{"name":"user_id","required":true,"transform":{"type":"scalar"},"locs":[{"a":95,"b":103}]},{"name":"client_id","required":true,"transform":{"type":"scalar"},"locs":[{"a":106,"b":116}]},{"name":"label","required":false,"transform":{"type":"scalar"},"locs":[{"a":130,"b":135}]},{"name":"user_agent","required":false,"transform":{"type":"scalar"},"locs":[{"a":138,"b":148}]},{"name":"last_seen_ip","required":false,"transform":{"type":"scalar"},"locs":[{"a":151,"b":163}]}],"statement":"INSERT INTO user_devices (user_id, client_id, status, label, user_agent, last_seen_ip)\nVALUES (:user_id!, :client_id!, 'pending', :label, :user_agent, :last_seen_ip)                                                                                                                                                                                                                                                                                                                                "};

/**
 * Query generated from SQL:
 * ```
 * INSERT INTO user_devices (user_id, client_id, status, label, user_agent, last_seen_ip)
 * VALUES (:user_id!, :client_id!, 'pending', :label, :user_agent, :last_seen_ip)                                                                                                                                                                                                                                                                                                                                
 * ```
 */
export const insertPendingDevice = new PreparedQuery<IInsertPendingDeviceParams,IInsertPendingDeviceResult>(insertPendingDeviceIR);


/** 'UpsertApprovedDevice' parameters type */
export interface IUpsertApprovedDeviceParams {
  client_id: string;
  label?: string | null | void;
  last_seen_ip?: string | null | void;
  user_agent?: string | null | void;
  user_id: number;
}

/** 'UpsertApprovedDevice' return type */
export type IUpsertApprovedDeviceResult = void;

/** 'UpsertApprovedDevice' query type */
export interface IUpsertApprovedDeviceQuery {
  params: IUpsertApprovedDeviceParams;
  result: IUpsertApprovedDeviceResult;
}

const upsertApprovedDeviceIR: any = {"usedParamSet":{"user_id":true,"client_id":true,"label":true,"user_agent":true,"last_seen_ip":true},"params":[{"name":"user_id","required":true,"transform":{"type":"scalar"},"locs":[{"a":121,"b":129},{"a":212,"b":220}]},{"name":"client_id","required":true,"transform":{"type":"scalar"},"locs":[{"a":132,"b":142}]},{"name":"label","required":false,"transform":{"type":"scalar"},"locs":[{"a":157,"b":162}]},{"name":"user_agent","required":false,"transform":{"type":"scalar"},"locs":[{"a":165,"b":175}]},{"name":"last_seen_ip","required":false,"transform":{"type":"scalar"},"locs":[{"a":178,"b":190}]}],"statement":"INSERT INTO user_devices (user_id, client_id, status, label, user_agent, last_seen_ip, approved_at, approved_by)\nVALUES (:user_id!, :client_id!, 'approved', :label, :user_agent, :last_seen_ip, CURRENT_TIMESTAMP, :user_id!)\nON CONFLICT (user_id, client_id) DO UPDATE\n   SET status       = 'approved',\n       approved_at  = CURRENT_TIMESTAMP,\n       approved_by  = EXCLUDED.approved_by,\n       label        = COALESCE(EXCLUDED.label,        user_devices.label),\n       user_agent   = COALESCE(EXCLUDED.user_agent,   user_devices.user_agent),\n       last_seen_ip = COALESCE(EXCLUDED.last_seen_ip, user_devices.last_seen_ip)"};

/**
 * Query generated from SQL:
 * ```
 * INSERT INTO user_devices (user_id, client_id, status, label, user_agent, last_seen_ip, approved_at, approved_by)
 * VALUES (:user_id!, :client_id!, 'approved', :label, :user_agent, :last_seen_ip, CURRENT_TIMESTAMP, :user_id!)
 * ON CONFLICT (user_id, client_id) DO UPDATE
 *    SET status       = 'approved',
 *        approved_at  = CURRENT_TIMESTAMP,
 *        approved_by  = EXCLUDED.approved_by,
 *        label        = COALESCE(EXCLUDED.label,        user_devices.label),
 *        user_agent   = COALESCE(EXCLUDED.user_agent,   user_devices.user_agent),
 *        last_seen_ip = COALESCE(EXCLUDED.last_seen_ip, user_devices.last_seen_ip)
 * ```
 */
export const upsertApprovedDevice = new PreparedQuery<IUpsertApprovedDeviceParams,IUpsertApprovedDeviceResult>(upsertApprovedDeviceIR);


/** 'UpdateDeviceLastSeen' parameters type */
export interface IUpdateDeviceLastSeenParams {
  client_id: string;
  last_seen_ip?: string | null | void;
  user_id: number;
}

/** 'UpdateDeviceLastSeen' return type */
export type IUpdateDeviceLastSeenResult = void;

/** 'UpdateDeviceLastSeen' query type */
export interface IUpdateDeviceLastSeenQuery {
  params: IUpdateDeviceLastSeenParams;
  result: IUpdateDeviceLastSeenResult;
}

const updateDeviceLastSeenIR: any = {"usedParamSet":{"last_seen_ip":true,"user_id":true,"client_id":true},"params":[{"name":"last_seen_ip","required":false,"transform":{"type":"scalar"},"locs":[{"a":39,"b":51}]},{"name":"user_id","required":true,"transform":{"type":"scalar"},"locs":[{"a":70,"b":78}]},{"name":"client_id","required":true,"transform":{"type":"scalar"},"locs":[{"a":96,"b":106}]}],"statement":"UPDATE user_devices SET last_seen_ip = :last_seen_ip\n WHERE user_id = :user_id! AND client_id = :client_id!"};

/**
 * Query generated from SQL:
 * ```
 * UPDATE user_devices SET last_seen_ip = :last_seen_ip
 *  WHERE user_id = :user_id! AND client_id = :client_id!
 * ```
 */
export const updateDeviceLastSeen = new PreparedQuery<IUpdateDeviceLastSeenParams,IUpdateDeviceLastSeenResult>(updateDeviceLastSeenIR);


/** 'UpdateUserLastLogin' parameters type */
export interface IUpdateUserLastLoginParams {
  user_id: number;
}

/** 'UpdateUserLastLogin' return type */
export type IUpdateUserLastLoginResult = void;

/** 'UpdateUserLastLogin' query type */
export interface IUpdateUserLastLoginQuery {
  params: IUpdateUserLastLoginParams;
  result: IUpdateUserLastLoginResult;
}

const updateUserLastLoginIR: any = {"usedParamSet":{"user_id":true},"params":[{"name":"user_id","required":true,"transform":{"type":"scalar"},"locs":[{"a":59,"b":67}]}],"statement":"UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = :user_id!"};

/**
 * Query generated from SQL:
 * ```
 * UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = :user_id!
 * ```
 */
export const updateUserLastLogin = new PreparedQuery<IUpdateUserLastLoginParams,IUpdateUserLastLoginResult>(updateUserLastLoginIR);


/** 'InsertUser' parameters type */
export interface IInsertUserParams {
  email?: string | null | void;
  password_hash?: string | null | void;
  role: user_role;
  username: string;
}

/** 'InsertUser' return type */
export interface IInsertUserResult {
  created_at: Date;
  email: string | null;
  id: number;
  is_active: boolean;
  role: user_role;
  username: string;
}

/** 'InsertUser' query type */
export interface IInsertUserQuery {
  params: IInsertUserParams;
  result: IInsertUserResult;
}

const insertUserIR: any = {"usedParamSet":{"username":true,"email":true,"password_hash":true,"role":true},"params":[{"name":"username","required":true,"transform":{"type":"scalar"},"locs":[{"a":76,"b":85}]},{"name":"email","required":false,"transform":{"type":"scalar"},"locs":[{"a":88,"b":93}]},{"name":"password_hash","required":false,"transform":{"type":"scalar"},"locs":[{"a":96,"b":109}]},{"name":"role","required":true,"transform":{"type":"scalar"},"locs":[{"a":112,"b":117}]}],"statement":"INSERT INTO users (username, email, password_hash, role, is_active)\nVALUES (:username!, :email, :password_hash, :role!::user_role, FALSE)\nRETURNING id, username, email, role, is_active, created_at"};

/**
 * Query generated from SQL:
 * ```
 * INSERT INTO users (username, email, password_hash, role, is_active)
 * VALUES (:username!, :email, :password_hash, :role!::user_role, FALSE)
 * RETURNING id, username, email, role, is_active, created_at
 * ```
 */
export const insertUser = new PreparedQuery<IInsertUserParams,IInsertUserResult>(insertUserIR);


/** 'ListUsers' parameters type */
export type IListUsersParams = void;

/** 'ListUsers' return type */
export interface IListUsersResult {
  created_at: Date;
  email: string | null;
  id: number;
  is_active: boolean;
  last_login: Date | null;
  role: user_role;
  username: string;
}

/** 'ListUsers' query type */
export interface IListUsersQuery {
  params: IListUsersParams;
  result: IListUsersResult;
}

const listUsersIR: any = {"usedParamSet":{},"params":[],"statement":"SELECT id, username, email, is_active, last_login, created_at, role\n  FROM users\n ORDER BY id DESC"};

/**
 * Query generated from SQL:
 * ```
 * SELECT id, username, email, is_active, last_login, created_at, role
 *   FROM users
 *  ORDER BY id DESC
 * ```
 */
export const listUsers = new PreparedQuery<IListUsersParams,IListUsersResult>(listUsersIR);


/** 'UsersSummary' parameters type */
export type IUsersSummaryParams = void;

/** 'UsersSummary' return type */
export interface IUsersSummaryResult {
  managers: string | null;
  operators: string | null;
  sales: string | null;
  total_users: string | null;
}

/** 'UsersSummary' query type */
export interface IUsersSummaryQuery {
  params: IUsersSummaryParams;
  result: IUsersSummaryResult;
}

const usersSummaryIR: any = {"usedParamSet":{},"params":[],"statement":"SELECT\n    count(*)                                       AS total_users,\n    count(*) filter (where role = 'manager')       AS managers,\n    count(*) filter (where role = 'operator')      AS operators,\n    count(*) filter (where role = 'sales')         AS sales\n  FROM users"};

/**
 * Query generated from SQL:
 * ```
 * SELECT
 *     count(*)                                       AS total_users,
 *     count(*) filter (where role = 'manager')       AS managers,
 *     count(*) filter (where role = 'operator')      AS operators,
 *     count(*) filter (where role = 'sales')         AS sales
 *   FROM users
 * ```
 */
export const usersSummary = new PreparedQuery<IUsersSummaryParams,IUsersSummaryResult>(usersSummaryIR);


/** 'ListRoles' parameters type */
export type IListRolesParams = void;

/** 'ListRoles' return type */
export interface IListRolesResult {
  name: string | null;
}

/** 'ListRoles' query type */
export interface IListRolesQuery {
  params: IListRolesParams;
  result: IListRolesResult;
}

const listRolesIR: any = {"usedParamSet":{},"params":[],"statement":"SELECT unnest(enum_range(NULL::user_role))::text AS name"};

/**
 * Query generated from SQL:
 * ```
 * SELECT unnest(enum_range(NULL::user_role))::text AS name
 * ```
 */
export const listRoles = new PreparedQuery<IListRolesParams,IListRolesResult>(listRolesIR);


/** 'PatchUser' parameters type */
export interface IPatchUserParams {
  email?: string | null | void;
  id: number;
  is_active?: boolean | null | void;
  password_hash?: string | null | void;
  role?: user_role | null | void;
  username?: string | null | void;
}

/** 'PatchUser' return type */
export interface IPatchUserResult {
  email: string | null;
  id: number;
  is_active: boolean;
  role: user_role;
  username: string;
}

/** 'PatchUser' query type */
export interface IPatchUserQuery {
  params: IPatchUserParams;
  result: IPatchUserResult;
}

const patchUserIR: any = {"usedParamSet":{"username":true,"email":true,"role":true,"password_hash":true,"is_active":true,"id":true},"params":[{"name":"username","required":false,"transform":{"type":"scalar"},"locs":[{"a":45,"b":53}]},{"name":"email","required":false,"transform":{"type":"scalar"},"locs":[{"a":99,"b":104}]},{"name":"role","required":false,"transform":{"type":"scalar"},"locs":[{"a":147,"b":151}]},{"name":"password_hash","required":false,"transform":{"type":"scalar"},"locs":[{"a":204,"b":217}]},{"name":"is_active","required":false,"transform":{"type":"scalar"},"locs":[{"a":268,"b":277}]},{"name":"id","required":true,"transform":{"type":"scalar"},"locs":[{"a":345,"b":348}]}],"statement":"UPDATE users\n   SET username      = COALESCE(:username, username),\n       email         = COALESCE(:email, email),\n       role          = COALESCE(:role::user_role, role),\n       password_hash = COALESCE(:password_hash, password_hash),\n       is_active     = COALESCE(:is_active, is_active),\n       updated_at    = CURRENT_TIMESTAMP\n WHERE id = :id!\n RETURNING id, username, email, role, is_active"};

/**
 * Query generated from SQL:
 * ```
 * UPDATE users
 *    SET username      = COALESCE(:username, username),
 *        email         = COALESCE(:email, email),
 *        role          = COALESCE(:role::user_role, role),
 *        password_hash = COALESCE(:password_hash, password_hash),
 *        is_active     = COALESCE(:is_active, is_active),
 *        updated_at    = CURRENT_TIMESTAMP
 *  WHERE id = :id!
 *  RETURNING id, username, email, role, is_active
 * ```
 */
export const patchUser = new PreparedQuery<IPatchUserParams,IPatchUserResult>(patchUserIR);


/** 'DeleteUser' parameters type */
export interface IDeleteUserParams {
  id: number;
}

/** 'DeleteUser' return type */
export interface IDeleteUserResult {
  id: number;
  username: string;
}

/** 'DeleteUser' query type */
export interface IDeleteUserQuery {
  params: IDeleteUserParams;
  result: IDeleteUserResult;
}

const deleteUserIR: any = {"usedParamSet":{"id":true},"params":[{"name":"id","required":true,"transform":{"type":"scalar"},"locs":[{"a":29,"b":32}]}],"statement":"DELETE FROM users WHERE id = :id! RETURNING id, username"};

/**
 * Query generated from SQL:
 * ```
 * DELETE FROM users WHERE id = :id! RETURNING id, username
 * ```
 */
export const deleteUser = new PreparedQuery<IDeleteUserParams,IDeleteUserResult>(deleteUserIR);


/** 'ListPendingDeviceRequests' parameters type */
export type IListPendingDeviceRequestsParams = void;

/** 'ListPendingDeviceRequests' return type */
export interface IListPendingDeviceRequestsResult {
  device: string | null;
  id: number;
  last_seen_ip: string | null;
  requested_at: Date;
  status: string | null;
  user: string;
}

/** 'ListPendingDeviceRequests' query type */
export interface IListPendingDeviceRequestsQuery {
  params: IListPendingDeviceRequestsParams;
  result: IListPendingDeviceRequestsResult;
}

const listPendingDeviceRequestsIR: any = {"usedParamSet":{},"params":[],"statement":"SELECT d.id,\n       u.username     AS \"user\",\n       d.label        AS device,\n       d.last_seen_ip,\n       d.created_at   AS requested_at,\n       d.status::text AS status\n  FROM user_devices d\n  JOIN users u ON u.id = d.user_id\n WHERE d.status = 'pending'\n ORDER BY d.created_at DESC"};

/**
 * Query generated from SQL:
 * ```
 * SELECT d.id,
 *        u.username     AS "user",
 *        d.label        AS device,
 *        d.last_seen_ip,
 *        d.created_at   AS requested_at,
 *        d.status::text AS status
 *   FROM user_devices d
 *   JOIN users u ON u.id = d.user_id
 *  WHERE d.status = 'pending'
 *  ORDER BY d.created_at DESC
 * ```
 */
export const listPendingDeviceRequests = new PreparedQuery<IListPendingDeviceRequestsParams,IListPendingDeviceRequestsResult>(listPendingDeviceRequestsIR);


/** 'ApproveDevice' parameters type */
export interface IApproveDeviceParams {
  approver_id: number;
  id: number;
}

/** 'ApproveDevice' return type */
export interface IApproveDeviceResult {
  user_id: number;
}

/** 'ApproveDevice' query type */
export interface IApproveDeviceQuery {
  params: IApproveDeviceParams;
  result: IApproveDeviceResult;
}

const approveDeviceIR: any = {"usedParamSet":{"approver_id":true,"id":true},"params":[{"name":"approver_id","required":true,"transform":{"type":"scalar"},"locs":[{"a":74,"b":86}]},{"name":"id","required":true,"transform":{"type":"scalar"},"locs":[{"a":140,"b":143}]}],"statement":"UPDATE user_devices\n   SET status      = 'approved',\n       approved_by = :approver_id!,\n       approved_at = CURRENT_TIMESTAMP\n WHERE id = :id!\n RETURNING user_id"};

/**
 * Query generated from SQL:
 * ```
 * UPDATE user_devices
 *    SET status      = 'approved',
 *        approved_by = :approver_id!,
 *        approved_at = CURRENT_TIMESTAMP
 *  WHERE id = :id!
 *  RETURNING user_id
 * ```
 */
export const approveDevice = new PreparedQuery<IApproveDeviceParams,IApproveDeviceResult>(approveDeviceIR);


/** 'RejectDevice' parameters type */
export interface IRejectDeviceParams {
  id: number;
}

/** 'RejectDevice' return type */
export interface IRejectDeviceResult {
  id: number;
}

/** 'RejectDevice' query type */
export interface IRejectDeviceQuery {
  params: IRejectDeviceParams;
  result: IRejectDeviceResult;
}

const rejectDeviceIR: any = {"usedParamSet":{"id":true},"params":[{"name":"id","required":true,"transform":{"type":"scalar"},"locs":[{"a":55,"b":58}]}],"statement":"UPDATE user_devices SET status = 'rejected' WHERE id = :id! RETURNING id"};

/**
 * Query generated from SQL:
 * ```
 * UPDATE user_devices SET status = 'rejected' WHERE id = :id! RETURNING id
 * ```
 */
export const rejectDevice = new PreparedQuery<IRejectDeviceParams,IRejectDeviceResult>(rejectDeviceIR);


/** 'ListPaints' parameters type */
export interface IListPaintsParams {
  classification?: paint_classification | null | void;
  hsn_code?: string | null | void;
  include_archived?: boolean | null | void;
  ink_series?: ink_series | null | void;
  page_offset: NumberOrString;
  page_size: NumberOrString;
  product_code?: string | null | void;
  search?: string | null | void;
  tag?: string | null | void;
}

/** 'ListPaints' return type */
export interface IListPaintsResult {
  _total: string | null;
  archived_at: Date | null;
  classifications: unknown | null;
  created_at: Date;
  hsn_code: string | null;
  id: number;
  ink_series: unknown | null;
  name: string;
  notes: string | null;
  product_code: string | null;
  swatch: string | null;
  tags: unknown;
  updated_at: Date;
  variant_count: string | null;
}

/** 'ListPaints' query type */
export interface IListPaintsQuery {
  params: IListPaintsParams;
  result: IListPaintsResult;
}

const listPaintsIR: any = {"usedParamSet":{"include_archived":true,"search":true,"hsn_code":true,"product_code":true,"tag":true,"classification":true,"ink_series":true,"page_size":true,"page_offset":true},"params":[{"name":"include_archived","required":false,"transform":{"type":"scalar"},"locs":[{"a":601,"b":617}]},{"name":"search","required":false,"transform":{"type":"scalar"},"locs":[{"a":659,"b":665},{"a":703,"b":709},{"a":731,"b":737},{"a":763,"b":769}]},{"name":"hsn_code","required":false,"transform":{"type":"scalar"},"locs":[{"a":780,"b":788},{"a":824,"b":832}]},{"name":"product_code","required":false,"transform":{"type":"scalar"},"locs":[{"a":843,"b":855},{"a":891,"b":903}]},{"name":"tag","required":false,"transform":{"type":"scalar"},"locs":[{"a":914,"b":917},{"a":970,"b":973}]},{"name":"classification","required":false,"transform":{"type":"scalar"},"locs":[{"a":992,"b":1006},{"a":1138,"b":1152}]},{"name":"ink_series","required":false,"transform":{"type":"scalar"},"locs":[{"a":1191,"b":1201},{"a":1319,"b":1329}]},{"name":"page_size","required":true,"transform":{"type":"scalar"},"locs":[{"a":1403,"b":1413}]},{"name":"page_offset","required":true,"transform":{"type":"scalar"},"locs":[{"a":1422,"b":1434}]}],"statement":"SELECT p.id, p.name, p.swatch, p.notes, p.hsn_code, p.product_code, p.tags,\n       p.archived_at, p.created_at, p.updated_at,\n       COALESCE(jsonb_agg(DISTINCT v.classification::text) FILTER (WHERE v.archived_at IS NULL), '[]'::jsonb) AS classifications,\n       COALESCE(jsonb_agg(DISTINCT v.ink_series::text)     FILTER (WHERE v.archived_at IS NULL), '[]'::jsonb) AS ink_series,\n       COUNT(v.id) FILTER (WHERE v.archived_at IS NULL)    AS variant_count,\n       COUNT(*) OVER ()                                    AS _total\n  FROM paints p\n  LEFT JOIN paint_variants v ON v.paint_id = p.id\n WHERE (:include_archived::bool OR p.archived_at IS NULL)\n   AND (:search::text       IS NULL OR p.name ILIKE :search OR p.hsn_code ILIKE :search OR p.product_code ILIKE :search)\n   AND (:hsn_code::text     IS NULL OR p.hsn_code = :hsn_code)\n   AND (:product_code::text IS NULL OR p.product_code = :product_code)\n   AND (:tag::text          IS NULL OR p.tags @> to_jsonb(ARRAY[:tag::text]))\n   AND (:classification::paint_classification IS NULL\n        OR EXISTS (SELECT 1 FROM paint_variants v2 WHERE v2.paint_id = p.id AND v2.classification = :classification AND v2.archived_at IS NULL))\n   AND (:ink_series::ink_series IS NULL\n        OR EXISTS (SELECT 1 FROM paint_variants v3 WHERE v3.paint_id = p.id AND v3.ink_series = :ink_series AND v3.archived_at IS NULL))\n GROUP BY p.id\n ORDER BY p.name ASC\n LIMIT :page_size! OFFSET :page_offset!"};

/**
 * Query generated from SQL:
 * ```
 * SELECT p.id, p.name, p.swatch, p.notes, p.hsn_code, p.product_code, p.tags,
 *        p.archived_at, p.created_at, p.updated_at,
 *        COALESCE(jsonb_agg(DISTINCT v.classification::text) FILTER (WHERE v.archived_at IS NULL), '[]'::jsonb) AS classifications,
 *        COALESCE(jsonb_agg(DISTINCT v.ink_series::text)     FILTER (WHERE v.archived_at IS NULL), '[]'::jsonb) AS ink_series,
 *        COUNT(v.id) FILTER (WHERE v.archived_at IS NULL)    AS variant_count,
 *        COUNT(*) OVER ()                                    AS _total
 *   FROM paints p
 *   LEFT JOIN paint_variants v ON v.paint_id = p.id
 *  WHERE (:include_archived::bool OR p.archived_at IS NULL)
 *    AND (:search::text       IS NULL OR p.name ILIKE :search OR p.hsn_code ILIKE :search OR p.product_code ILIKE :search)
 *    AND (:hsn_code::text     IS NULL OR p.hsn_code = :hsn_code)
 *    AND (:product_code::text IS NULL OR p.product_code = :product_code)
 *    AND (:tag::text          IS NULL OR p.tags @> to_jsonb(ARRAY[:tag::text]))
 *    AND (:classification::paint_classification IS NULL
 *         OR EXISTS (SELECT 1 FROM paint_variants v2 WHERE v2.paint_id = p.id AND v2.classification = :classification AND v2.archived_at IS NULL))
 *    AND (:ink_series::ink_series IS NULL
 *         OR EXISTS (SELECT 1 FROM paint_variants v3 WHERE v3.paint_id = p.id AND v3.ink_series = :ink_series AND v3.archived_at IS NULL))
 *  GROUP BY p.id
 *  ORDER BY p.name ASC
 *  LIMIT :page_size! OFFSET :page_offset!
 * ```
 */
export const listPaints = new PreparedQuery<IListPaintsParams,IListPaintsResult>(listPaintsIR);


/** 'GetPaint' parameters type */
export interface IGetPaintParams {
  id: number;
}

/** 'GetPaint' return type */
export interface IGetPaintResult {
  archived_at: Date | null;
  created_at: Date;
  hsn_code: string | null;
  id: number;
  name: string;
  notes: string | null;
  product_code: string | null;
  swatch: string | null;
  tags: unknown;
  updated_at: Date;
  variants: unknown | null;
}

/** 'GetPaint' query type */
export interface IGetPaintQuery {
  params: IGetPaintParams;
  result: IGetPaintResult;
}

const getPaintIR: any = {"usedParamSet":{"id":true},"params":[{"name":"id","required":true,"transform":{"type":"scalar"},"locs":[{"a":532,"b":535}]}],"statement":"SELECT p.id, p.name, p.swatch, p.notes, p.hsn_code, p.product_code, p.tags,\n       p.archived_at, p.created_at, p.updated_at,\n       COALESCE((\n           SELECT jsonb_agg(jsonb_build_object(\n               'id', v.id,\n               'classification', v.classification,\n               'ink_series', v.ink_series,\n               'archived_at', v.archived_at\n           ) ORDER BY v.classification, v.ink_series)\n           FROM paint_variants v WHERE v.paint_id = p.id\n       ), '[]'::jsonb) AS variants\n  FROM paints p WHERE p.id = :id!"};

/**
 * Query generated from SQL:
 * ```
 * SELECT p.id, p.name, p.swatch, p.notes, p.hsn_code, p.product_code, p.tags,
 *        p.archived_at, p.created_at, p.updated_at,
 *        COALESCE((
 *            SELECT jsonb_agg(jsonb_build_object(
 *                'id', v.id,
 *                'classification', v.classification,
 *                'ink_series', v.ink_series,
 *                'archived_at', v.archived_at
 *            ) ORDER BY v.classification, v.ink_series)
 *            FROM paint_variants v WHERE v.paint_id = p.id
 *        ), '[]'::jsonb) AS variants
 *   FROM paints p WHERE p.id = :id!
 * ```
 */
export const getPaint = new PreparedQuery<IGetPaintParams,IGetPaintResult>(getPaintIR);


/** 'InsertPaint' parameters type */
export interface IInsertPaintParams {
  created_by: number;
  hsn_code?: string | null | void;
  name: string;
  notes?: string | null | void;
  product_code?: string | null | void;
  swatch?: string | null | void;
  tags?: unknown | null | void;
}

/** 'InsertPaint' return type */
export interface IInsertPaintResult {
  id: number;
}

/** 'InsertPaint' query type */
export interface IInsertPaintQuery {
  params: IInsertPaintParams;
  result: IInsertPaintResult;
}

const insertPaintIR: any = {"usedParamSet":{"name":true,"swatch":true,"notes":true,"hsn_code":true,"product_code":true,"tags":true,"created_by":true},"params":[{"name":"name","required":true,"transform":{"type":"scalar"},"locs":[{"a":91,"b":96}]},{"name":"swatch","required":false,"transform":{"type":"scalar"},"locs":[{"a":99,"b":105}]},{"name":"notes","required":false,"transform":{"type":"scalar"},"locs":[{"a":108,"b":113}]},{"name":"hsn_code","required":false,"transform":{"type":"scalar"},"locs":[{"a":116,"b":124}]},{"name":"product_code","required":false,"transform":{"type":"scalar"},"locs":[{"a":127,"b":139}]},{"name":"tags","required":false,"transform":{"type":"scalar"},"locs":[{"a":159,"b":163}]},{"name":"created_by","required":true,"transform":{"type":"scalar"},"locs":[{"a":187,"b":198}]}],"statement":"INSERT INTO paints (name, swatch, notes, hsn_code, product_code, tags, created_by)\nVALUES (:name!, :swatch, :notes, :hsn_code, :product_code,\n        COALESCE(:tags::jsonb, '[]'::jsonb), :created_by!)\nRETURNING id"};

/**
 * Query generated from SQL:
 * ```
 * INSERT INTO paints (name, swatch, notes, hsn_code, product_code, tags, created_by)
 * VALUES (:name!, :swatch, :notes, :hsn_code, :product_code,
 *         COALESCE(:tags::jsonb, '[]'::jsonb), :created_by!)
 * RETURNING id
 * ```
 */
export const insertPaint = new PreparedQuery<IInsertPaintParams,IInsertPaintResult>(insertPaintIR);


/** 'PatchPaint' parameters type */
export interface IPatchPaintParams {
  hsn_code?: string | null | void;
  id: number;
  name?: string | null | void;
  notes?: string | null | void;
  product_code?: string | null | void;
  swatch?: string | null | void;
  tags?: unknown | null | void;
}

/** 'PatchPaint' return type */
export interface IPatchPaintResult {
  id: number;
}

/** 'PatchPaint' query type */
export interface IPatchPaintQuery {
  params: IPatchPaintParams;
  result: IPatchPaintResult;
}

const patchPaintIR: any = {"usedParamSet":{"name":true,"swatch":true,"notes":true,"hsn_code":true,"product_code":true,"tags":true,"id":true},"params":[{"name":"name","required":false,"transform":{"type":"scalar"},"locs":[{"a":45,"b":49}]},{"name":"swatch","required":false,"transform":{"type":"scalar"},"locs":[{"a":98,"b":104}]},{"name":"notes","required":false,"transform":{"type":"scalar"},"locs":[{"a":153,"b":158}]},{"name":"hsn_code","required":false,"transform":{"type":"scalar"},"locs":[{"a":207,"b":215}]},{"name":"product_code","required":false,"transform":{"type":"scalar"},"locs":[{"a":264,"b":276}]},{"name":"tags","required":false,"transform":{"type":"scalar"},"locs":[{"a":325,"b":329}]},{"name":"id","required":true,"transform":{"type":"scalar"},"locs":[{"a":399,"b":402}]}],"statement":"UPDATE paints\n   SET name         = COALESCE(:name,         name),\n       swatch       = COALESCE(:swatch,       swatch),\n       notes        = COALESCE(:notes,        notes),\n       hsn_code     = COALESCE(:hsn_code,     hsn_code),\n       product_code = COALESCE(:product_code, product_code),\n       tags         = COALESCE(:tags::jsonb,  tags),\n       updated_at   = CURRENT_TIMESTAMP\n WHERE id = :id!\n RETURNING id"};

/**
 * Query generated from SQL:
 * ```
 * UPDATE paints
 *    SET name         = COALESCE(:name,         name),
 *        swatch       = COALESCE(:swatch,       swatch),
 *        notes        = COALESCE(:notes,        notes),
 *        hsn_code     = COALESCE(:hsn_code,     hsn_code),
 *        product_code = COALESCE(:product_code, product_code),
 *        tags         = COALESCE(:tags::jsonb,  tags),
 *        updated_at   = CURRENT_TIMESTAMP
 *  WHERE id = :id!
 *  RETURNING id
 * ```
 */
export const patchPaint = new PreparedQuery<IPatchPaintParams,IPatchPaintResult>(patchPaintIR);


/** 'ArchivePaint' parameters type */
export interface IArchivePaintParams {
  id: number;
  user_id: number;
}

/** 'ArchivePaint' return type */
export interface IArchivePaintResult {
  id: number;
}

/** 'ArchivePaint' query type */
export interface IArchivePaintQuery {
  params: IArchivePaintParams;
  result: IArchivePaintResult;
}

const archivePaintIR: any = {"usedParamSet":{"user_id":true,"id":true},"params":[{"name":"user_id","required":true,"transform":{"type":"scalar"},"locs":[{"a":65,"b":73}]},{"name":"id","required":true,"transform":{"type":"scalar"},"locs":[{"a":87,"b":90}]}],"statement":"UPDATE paints SET archived_at = CURRENT_TIMESTAMP, archived_by = :user_id!\n WHERE id = :id! AND archived_at IS NULL RETURNING id"};

/**
 * Query generated from SQL:
 * ```
 * UPDATE paints SET archived_at = CURRENT_TIMESTAMP, archived_by = :user_id!
 *  WHERE id = :id! AND archived_at IS NULL RETURNING id
 * ```
 */
export const archivePaint = new PreparedQuery<IArchivePaintParams,IArchivePaintResult>(archivePaintIR);


/** 'RestorePaint' parameters type */
export interface IRestorePaintParams {
  id: number;
}

/** 'RestorePaint' return type */
export interface IRestorePaintResult {
  id: number;
}

/** 'RestorePaint' query type */
export interface IRestorePaintQuery {
  params: IRestorePaintParams;
  result: IRestorePaintResult;
}

const restorePaintIR: any = {"usedParamSet":{"id":true},"params":[{"name":"id","required":true,"transform":{"type":"scalar"},"locs":[{"a":68,"b":71}]}],"statement":"UPDATE paints SET archived_at = NULL, archived_by = NULL WHERE id = :id! RETURNING id"};

/**
 * Query generated from SQL:
 * ```
 * UPDATE paints SET archived_at = NULL, archived_by = NULL WHERE id = :id! RETURNING id
 * ```
 */
export const restorePaint = new PreparedQuery<IRestorePaintParams,IRestorePaintResult>(restorePaintIR);


/** 'ArchivePaintVariants' parameters type */
export interface IArchivePaintVariantsParams {
  paint_id: number;
  user_id: number;
}

/** 'ArchivePaintVariants' return type */
export type IArchivePaintVariantsResult = void;

/** 'ArchivePaintVariants' query type */
export interface IArchivePaintVariantsQuery {
  params: IArchivePaintVariantsParams;
  result: IArchivePaintVariantsResult;
}

const archivePaintVariantsIR: any = {"usedParamSet":{"user_id":true,"paint_id":true},"params":[{"name":"user_id","required":true,"transform":{"type":"scalar"},"locs":[{"a":73,"b":81}]},{"name":"paint_id","required":true,"transform":{"type":"scalar"},"locs":[{"a":101,"b":110}]}],"statement":"UPDATE paint_variants SET archived_at = CURRENT_TIMESTAMP, archived_by = :user_id!\n WHERE paint_id = :paint_id! AND archived_at IS NULL"};

/**
 * Query generated from SQL:
 * ```
 * UPDATE paint_variants SET archived_at = CURRENT_TIMESTAMP, archived_by = :user_id!
 *  WHERE paint_id = :paint_id! AND archived_at IS NULL
 * ```
 */
export const archivePaintVariants = new PreparedQuery<IArchivePaintVariantsParams,IArchivePaintVariantsResult>(archivePaintVariantsIR);


/** 'RestorePaintVariants' parameters type */
export interface IRestorePaintVariantsParams {
  paint_id: number;
}

/** 'RestorePaintVariants' return type */
export type IRestorePaintVariantsResult = void;

/** 'RestorePaintVariants' query type */
export interface IRestorePaintVariantsQuery {
  params: IRestorePaintVariantsParams;
  result: IRestorePaintVariantsResult;
}

const restorePaintVariantsIR: any = {"usedParamSet":{"paint_id":true},"params":[{"name":"paint_id","required":true,"transform":{"type":"scalar"},"locs":[{"a":82,"b":91}]}],"statement":"UPDATE paint_variants SET archived_at = NULL, archived_by = NULL WHERE paint_id = :paint_id!"};

/**
 * Query generated from SQL:
 * ```
 * UPDATE paint_variants SET archived_at = NULL, archived_by = NULL WHERE paint_id = :paint_id!
 * ```
 */
export const restorePaintVariants = new PreparedQuery<IRestorePaintVariantsParams,IRestorePaintVariantsResult>(restorePaintVariantsIR);


/** 'PaintExists' parameters type */
export interface IPaintExistsParams {
  id: number;
}

/** 'PaintExists' return type */
export interface IPaintExistsResult {
  one: number | null;
}

/** 'PaintExists' query type */
export interface IPaintExistsQuery {
  params: IPaintExistsParams;
  result: IPaintExistsResult;
}

const paintExistsIR: any = {"usedParamSet":{"id":true},"params":[{"name":"id","required":true,"transform":{"type":"scalar"},"locs":[{"a":39,"b":42}]}],"statement":"SELECT 1 AS one FROM paints WHERE id = :id!"};

/**
 * Query generated from SQL:
 * ```
 * SELECT 1 AS one FROM paints WHERE id = :id!
 * ```
 */
export const paintExists = new PreparedQuery<IPaintExistsParams,IPaintExistsResult>(paintExistsIR);


/** 'UpsertPaintVariant' parameters type */
export interface IUpsertPaintVariantParams {
  classification: paint_classification;
  ink_series: ink_series;
  paint_id: number;
}

/** 'UpsertPaintVariant' return type */
export type IUpsertPaintVariantResult = void;

/** 'UpsertPaintVariant' query type */
export interface IUpsertPaintVariantQuery {
  params: IUpsertPaintVariantParams;
  result: IUpsertPaintVariantResult;
}

const upsertPaintVariantIR: any = {"usedParamSet":{"paint_id":true,"classification":true,"ink_series":true},"params":[{"name":"paint_id","required":true,"transform":{"type":"scalar"},"locs":[{"a":74,"b":83}]},{"name":"classification","required":true,"transform":{"type":"scalar"},"locs":[{"a":86,"b":101}]},{"name":"ink_series","required":true,"transform":{"type":"scalar"},"locs":[{"a":126,"b":137}]}],"statement":"INSERT INTO paint_variants (paint_id, classification, ink_series)\nVALUES (:paint_id!, :classification!::paint_classification, :ink_series!::ink_series)\nON CONFLICT (paint_id, classification, ink_series)\nDO UPDATE SET archived_at = NULL, archived_by = NULL"};

/**
 * Query generated from SQL:
 * ```
 * INSERT INTO paint_variants (paint_id, classification, ink_series)
 * VALUES (:paint_id!, :classification!::paint_classification, :ink_series!::ink_series)
 * ON CONFLICT (paint_id, classification, ink_series)
 * DO UPDATE SET archived_at = NULL, archived_by = NULL
 * ```
 */
export const upsertPaintVariant = new PreparedQuery<IUpsertPaintVariantParams,IUpsertPaintVariantResult>(upsertPaintVariantIR);


/** 'GetVariant' parameters type */
export interface IGetVariantParams {
  id: number;
}

/** 'GetVariant' return type */
export interface IGetVariantResult {
  archived_at: Date | null;
  classification: paint_classification;
  hsn_code: string | null;
  id: number;
  ink_series: ink_series;
  paint_id: number;
  paint_name: string;
  product_code: string | null;
  swatch: string | null;
}

/** 'GetVariant' query type */
export interface IGetVariantQuery {
  params: IGetVariantParams;
  result: IGetVariantResult;
}

const getVariantIR: any = {"usedParamSet":{"id":true},"params":[{"name":"id","required":true,"transform":{"type":"scalar"},"locs":[{"a":213,"b":216}]}],"statement":"SELECT v.id, v.paint_id, v.classification, v.ink_series, v.archived_at,\n       p.name AS paint_name, p.hsn_code, p.product_code, p.swatch\n  FROM paint_variants v\n  JOIN paints p ON p.id = v.paint_id\n WHERE v.id = :id!"};

/**
 * Query generated from SQL:
 * ```
 * SELECT v.id, v.paint_id, v.classification, v.ink_series, v.archived_at,
 *        p.name AS paint_name, p.hsn_code, p.product_code, p.swatch
 *   FROM paint_variants v
 *   JOIN paints p ON p.id = v.paint_id
 *  WHERE v.id = :id!
 * ```
 */
export const getVariant = new PreparedQuery<IGetVariantParams,IGetVariantResult>(getVariantIR);


/** 'ArchiveVariant' parameters type */
export interface IArchiveVariantParams {
  id: number;
  user_id: number;
}

/** 'ArchiveVariant' return type */
export interface IArchiveVariantResult {
  id: number;
}

/** 'ArchiveVariant' query type */
export interface IArchiveVariantQuery {
  params: IArchiveVariantParams;
  result: IArchiveVariantResult;
}

const archiveVariantIR: any = {"usedParamSet":{"user_id":true,"id":true},"params":[{"name":"user_id","required":true,"transform":{"type":"scalar"},"locs":[{"a":73,"b":81}]},{"name":"id","required":true,"transform":{"type":"scalar"},"locs":[{"a":95,"b":98}]}],"statement":"UPDATE paint_variants SET archived_at = CURRENT_TIMESTAMP, archived_by = :user_id!\n WHERE id = :id! AND archived_at IS NULL RETURNING id"};

/**
 * Query generated from SQL:
 * ```
 * UPDATE paint_variants SET archived_at = CURRENT_TIMESTAMP, archived_by = :user_id!
 *  WHERE id = :id! AND archived_at IS NULL RETURNING id
 * ```
 */
export const archiveVariant = new PreparedQuery<IArchiveVariantParams,IArchiveVariantResult>(archiveVariantIR);


/** 'RestoreVariant' parameters type */
export interface IRestoreVariantParams {
  id: number;
}

/** 'RestoreVariant' return type */
export interface IRestoreVariantResult {
  id: number;
}

/** 'RestoreVariant' query type */
export interface IRestoreVariantQuery {
  params: IRestoreVariantParams;
  result: IRestoreVariantResult;
}

const restoreVariantIR: any = {"usedParamSet":{"id":true},"params":[{"name":"id","required":true,"transform":{"type":"scalar"},"locs":[{"a":76,"b":79}]}],"statement":"UPDATE paint_variants SET archived_at = NULL, archived_by = NULL WHERE id = :id! RETURNING id"};

/**
 * Query generated from SQL:
 * ```
 * UPDATE paint_variants SET archived_at = NULL, archived_by = NULL WHERE id = :id! RETURNING id
 * ```
 */
export const restoreVariant = new PreparedQuery<IRestoreVariantParams,IRestoreVariantResult>(restoreVariantIR);


/** 'ListFormulas' parameters type */
export interface IListFormulasParams {
  include_archived?: boolean | null | void;
  page_offset: NumberOrString;
  page_size: NumberOrString;
  search?: string | null | void;
  variant_id?: number | null | void;
}

/** 'ListFormulas' return type */
export interface IListFormulasResult {
  _total: string | null;
  archived_at: Date | null;
  classification: paint_classification;
  created_at: Date;
  dilution_threshold_pct: string | null;
  id: number;
  ink_series: ink_series;
  is_default: boolean;
  name: string;
  notes: string | null;
  paint_id: number;
  paint_name: string;
  resource_variance_threshold_pct: string | null;
  standard_output_kg: string;
  updated_at: Date;
  variant_id: number;
  wastage_threshold_pct: string | null;
}

/** 'ListFormulas' query type */
export interface IListFormulasQuery {
  params: IListFormulasParams;
  result: IListFormulasResult;
}

const listFormulasIR: any = {"usedParamSet":{"include_archived":true,"search":true,"variant_id":true,"page_size":true,"page_offset":true},"params":[{"name":"include_archived","required":false,"transform":{"type":"scalar"},"locs":[{"a":453,"b":469}]},{"name":"search","required":false,"transform":{"type":"scalar"},"locs":[{"a":511,"b":517},{"a":550,"b":556},{"a":574,"b":580}]},{"name":"variant_id","required":false,"transform":{"type":"scalar"},"locs":[{"a":591,"b":601},{"a":634,"b":644}]},{"name":"page_size","required":true,"transform":{"type":"scalar"},"locs":[{"a":713,"b":723}]},{"name":"page_offset","required":true,"transform":{"type":"scalar"},"locs":[{"a":732,"b":744}]}],"statement":"SELECT f.id, f.variant_id, f.name, f.standard_output_kg, f.is_default,\n       f.notes, f.wastage_threshold_pct, f.resource_variance_threshold_pct,\n       f.dilution_threshold_pct, f.archived_at, f.created_at, f.updated_at,\n       p.id AS paint_id, p.name AS paint_name,\n       v.classification, v.ink_series,\n       COUNT(*) OVER () AS _total\n  FROM formulas f\n  JOIN paint_variants v ON v.id = f.variant_id\n  JOIN paints p ON p.id = v.paint_id\n WHERE (:include_archived::bool OR f.archived_at IS NULL)\n   AND (:search::text  IS NULL OR f.name ILIKE :search OR p.name ILIKE :search)\n   AND (:variant_id::int IS NULL OR f.variant_id = :variant_id)\n ORDER BY p.name ASC, f.is_default DESC, f.created_at DESC\n LIMIT :page_size! OFFSET :page_offset!"};

/**
 * Query generated from SQL:
 * ```
 * SELECT f.id, f.variant_id, f.name, f.standard_output_kg, f.is_default,
 *        f.notes, f.wastage_threshold_pct, f.resource_variance_threshold_pct,
 *        f.dilution_threshold_pct, f.archived_at, f.created_at, f.updated_at,
 *        p.id AS paint_id, p.name AS paint_name,
 *        v.classification, v.ink_series,
 *        COUNT(*) OVER () AS _total
 *   FROM formulas f
 *   JOIN paint_variants v ON v.id = f.variant_id
 *   JOIN paints p ON p.id = v.paint_id
 *  WHERE (:include_archived::bool OR f.archived_at IS NULL)
 *    AND (:search::text  IS NULL OR f.name ILIKE :search OR p.name ILIKE :search)
 *    AND (:variant_id::int IS NULL OR f.variant_id = :variant_id)
 *  ORDER BY p.name ASC, f.is_default DESC, f.created_at DESC
 *  LIMIT :page_size! OFFSET :page_offset!
 * ```
 */
export const listFormulas = new PreparedQuery<IListFormulasParams,IListFormulasResult>(listFormulasIR);


/** 'ListFormulasByVariant' parameters type */
export interface IListFormulasByVariantParams {
  variant_id: number;
}

/** 'ListFormulasByVariant' return type */
export interface IListFormulasByVariantResult {
  archived_at: Date | null;
  created_at: Date;
  id: number;
  is_default: boolean;
  name: string;
  standard_output_kg: string;
}

/** 'ListFormulasByVariant' query type */
export interface IListFormulasByVariantQuery {
  params: IListFormulasByVariantParams;
  result: IListFormulasByVariantResult;
}

const listFormulasByVariantIR: any = {"usedParamSet":{"variant_id":true},"params":[{"name":"variant_id","required":true,"transform":{"type":"scalar"},"locs":[{"a":109,"b":120}]}],"statement":"SELECT id, name, standard_output_kg, is_default, archived_at, created_at\n  FROM formulas\n WHERE variant_id = :variant_id! AND archived_at IS NULL\n ORDER BY is_default DESC, created_at DESC"};

/**
 * Query generated from SQL:
 * ```
 * SELECT id, name, standard_output_kg, is_default, archived_at, created_at
 *   FROM formulas
 *  WHERE variant_id = :variant_id! AND archived_at IS NULL
 *  ORDER BY is_default DESC, created_at DESC
 * ```
 */
export const listFormulasByVariant = new PreparedQuery<IListFormulasByVariantParams,IListFormulasByVariantResult>(listFormulasByVariantIR);


/** 'GetFormula' parameters type */
export interface IGetFormulaParams {
  id: number;
}

/** 'GetFormula' return type */
export interface IGetFormulaResult {
  archived_at: Date | null;
  classification: paint_classification;
  created_at: Date;
  dilution_threshold_pct: string | null;
  id: number;
  ingredients: unknown | null;
  ink_series: ink_series;
  is_default: boolean;
  name: string;
  notes: string | null;
  paint_id: number;
  paint_name: string;
  resource_variance_threshold_pct: string | null;
  standard_output_kg: string;
  updated_at: Date;
  variant_id: number;
  wastage_threshold_pct: string | null;
}

/** 'GetFormula' query type */
export interface IGetFormulaQuery {
  params: IGetFormulaParams;
  result: IGetFormulaResult;
}

const getFormulaIR: any = {"usedParamSet":{"id":true},"params":[{"name":"id","required":true,"transform":{"type":"scalar"},"locs":[{"a":818,"b":821}]}],"statement":"SELECT f.id, f.variant_id, f.name, f.notes, f.standard_output_kg, f.is_default,\n       f.wastage_threshold_pct, f.resource_variance_threshold_pct, f.dilution_threshold_pct,\n       f.archived_at, f.created_at, f.updated_at,\n       v.classification, v.ink_series,\n       p.id AS paint_id, p.name AS paint_name,\n       COALESCE((\n           SELECT jsonb_agg(jsonb_build_object(\n               'resource_id', fr.resource_id,\n               'resource_name', r.name,\n               'quantity_kg', fr.quantity_kg\n           ) ORDER BY r.name)\n           FROM formula_resources fr\n           JOIN resources r ON r.id = fr.resource_id\n           WHERE fr.formula_id = f.id\n       ), '[]'::jsonb) AS ingredients\n  FROM formulas f\n  JOIN paint_variants v ON v.id = f.variant_id\n  JOIN paints p ON p.id = v.paint_id\n WHERE f.id = :id!"};

/**
 * Query generated from SQL:
 * ```
 * SELECT f.id, f.variant_id, f.name, f.notes, f.standard_output_kg, f.is_default,
 *        f.wastage_threshold_pct, f.resource_variance_threshold_pct, f.dilution_threshold_pct,
 *        f.archived_at, f.created_at, f.updated_at,
 *        v.classification, v.ink_series,
 *        p.id AS paint_id, p.name AS paint_name,
 *        COALESCE((
 *            SELECT jsonb_agg(jsonb_build_object(
 *                'resource_id', fr.resource_id,
 *                'resource_name', r.name,
 *                'quantity_kg', fr.quantity_kg
 *            ) ORDER BY r.name)
 *            FROM formula_resources fr
 *            JOIN resources r ON r.id = fr.resource_id
 *            WHERE fr.formula_id = f.id
 *        ), '[]'::jsonb) AS ingredients
 *   FROM formulas f
 *   JOIN paint_variants v ON v.id = f.variant_id
 *   JOIN paints p ON p.id = v.paint_id
 *  WHERE f.id = :id!
 * ```
 */
export const getFormula = new PreparedQuery<IGetFormulaParams,IGetFormulaResult>(getFormulaIR);


/** 'ClearDefaultFormulaForVariant' parameters type */
export interface IClearDefaultFormulaForVariantParams {
  variant_id: number;
}

/** 'ClearDefaultFormulaForVariant' return type */
export type IClearDefaultFormulaForVariantResult = void;

/** 'ClearDefaultFormulaForVariant' query type */
export interface IClearDefaultFormulaForVariantQuery {
  params: IClearDefaultFormulaForVariantParams;
  result: IClearDefaultFormulaForVariantResult;
}

const clearDefaultFormulaForVariantIR: any = {"usedParamSet":{"variant_id":true},"params":[{"name":"variant_id","required":true,"transform":{"type":"scalar"},"locs":[{"a":58,"b":69}]}],"statement":"UPDATE formulas SET is_default = false WHERE variant_id = :variant_id! AND is_default"};

/**
 * Query generated from SQL:
 * ```
 * UPDATE formulas SET is_default = false WHERE variant_id = :variant_id! AND is_default
 * ```
 */
export const clearDefaultFormulaForVariant = new PreparedQuery<IClearDefaultFormulaForVariantParams,IClearDefaultFormulaForVariantResult>(clearDefaultFormulaForVariantIR);


/** 'InsertFormula' parameters type */
export interface IInsertFormulaParams {
  created_by: number;
  dilution_threshold_pct?: NumberOrString | null | void;
  is_default?: boolean | null | void;
  name: string;
  notes?: string | null | void;
  resource_variance_threshold_pct?: NumberOrString | null | void;
  standard_output_kg: NumberOrString;
  variant_id: number;
  wastage_threshold_pct?: NumberOrString | null | void;
}

/** 'InsertFormula' return type */
export interface IInsertFormulaResult {
  id: number;
}

/** 'InsertFormula' query type */
export interface IInsertFormulaQuery {
  params: IInsertFormulaParams;
  result: IInsertFormulaResult;
}

const insertFormulaIR: any = {"usedParamSet":{"variant_id":true,"name":true,"notes":true,"standard_output_kg":true,"is_default":true,"wastage_threshold_pct":true,"resource_variance_threshold_pct":true,"dilution_threshold_pct":true,"created_by":true},"params":[{"name":"variant_id","required":true,"transform":{"type":"scalar"},"locs":[{"a":193,"b":204}]},{"name":"name","required":true,"transform":{"type":"scalar"},"locs":[{"a":207,"b":212}]},{"name":"notes","required":false,"transform":{"type":"scalar"},"locs":[{"a":215,"b":220}]},{"name":"standard_output_kg","required":true,"transform":{"type":"scalar"},"locs":[{"a":223,"b":242}]},{"name":"is_default","required":false,"transform":{"type":"scalar"},"locs":[{"a":254,"b":264}]},{"name":"wastage_threshold_pct","required":false,"transform":{"type":"scalar"},"locs":[{"a":283,"b":304}]},{"name":"resource_variance_threshold_pct","required":false,"transform":{"type":"scalar"},"locs":[{"a":307,"b":338}]},{"name":"dilution_threshold_pct","required":false,"transform":{"type":"scalar"},"locs":[{"a":341,"b":363}]},{"name":"created_by","required":true,"transform":{"type":"scalar"},"locs":[{"a":374,"b":385}]}],"statement":"INSERT INTO formulas\n    (variant_id, name, notes, standard_output_kg, is_default,\n     wastage_threshold_pct, resource_variance_threshold_pct, dilution_threshold_pct,\n     created_by)\nVALUES (:variant_id!, :name!, :notes, :standard_output_kg!, COALESCE(:is_default, false),\n        :wastage_threshold_pct, :resource_variance_threshold_pct, :dilution_threshold_pct,\n        :created_by!)\nRETURNING id"};

/**
 * Query generated from SQL:
 * ```
 * INSERT INTO formulas
 *     (variant_id, name, notes, standard_output_kg, is_default,
 *      wastage_threshold_pct, resource_variance_threshold_pct, dilution_threshold_pct,
 *      created_by)
 * VALUES (:variant_id!, :name!, :notes, :standard_output_kg!, COALESCE(:is_default, false),
 *         :wastage_threshold_pct, :resource_variance_threshold_pct, :dilution_threshold_pct,
 *         :created_by!)
 * RETURNING id
 * ```
 */
export const insertFormula = new PreparedQuery<IInsertFormulaParams,IInsertFormulaResult>(insertFormulaIR);


/** 'GetFormulaForCopy' parameters type */
export interface IGetFormulaForCopyParams {
  id: number;
}

/** 'GetFormulaForCopy' return type */
export interface IGetFormulaForCopyResult {
  dilution_threshold_pct: string | null;
  name: string;
  notes: string | null;
  resource_variance_threshold_pct: string | null;
  standard_output_kg: string;
  variant_id: number;
  wastage_threshold_pct: string | null;
}

/** 'GetFormulaForCopy' query type */
export interface IGetFormulaForCopyQuery {
  params: IGetFormulaForCopyParams;
  result: IGetFormulaForCopyResult;
}

const getFormulaForCopyIR: any = {"usedParamSet":{"id":true},"params":[{"name":"id","required":true,"transform":{"type":"scalar"},"locs":[{"a":165,"b":168}]}],"statement":"SELECT variant_id, name, notes, standard_output_kg,\n       wastage_threshold_pct, resource_variance_threshold_pct, dilution_threshold_pct\n  FROM formulas WHERE id = :id! AND archived_at IS NULL"};

/**
 * Query generated from SQL:
 * ```
 * SELECT variant_id, name, notes, standard_output_kg,
 *        wastage_threshold_pct, resource_variance_threshold_pct, dilution_threshold_pct
 *   FROM formulas WHERE id = :id! AND archived_at IS NULL
 * ```
 */
export const getFormulaForCopy = new PreparedQuery<IGetFormulaForCopyParams,IGetFormulaForCopyResult>(getFormulaForCopyIR);


/** 'InsertFormulaCopy' parameters type */
export interface IInsertFormulaCopyParams {
  created_by: number;
  dilution_threshold_pct?: NumberOrString | null | void;
  name: string;
  notes?: string | null | void;
  resource_variance_threshold_pct?: NumberOrString | null | void;
  standard_output_kg: NumberOrString;
  variant_id: number;
  wastage_threshold_pct?: NumberOrString | null | void;
}

/** 'InsertFormulaCopy' return type */
export interface IInsertFormulaCopyResult {
  id: number;
}

/** 'InsertFormulaCopy' query type */
export interface IInsertFormulaCopyQuery {
  params: IInsertFormulaCopyParams;
  result: IInsertFormulaCopyResult;
}

const insertFormulaCopyIR: any = {"usedParamSet":{"variant_id":true,"name":true,"notes":true,"standard_output_kg":true,"wastage_threshold_pct":true,"resource_variance_threshold_pct":true,"dilution_threshold_pct":true,"created_by":true},"params":[{"name":"variant_id","required":true,"transform":{"type":"scalar"},"locs":[{"a":193,"b":204}]},{"name":"name","required":true,"transform":{"type":"scalar"},"locs":[{"a":207,"b":212}]},{"name":"notes","required":false,"transform":{"type":"scalar"},"locs":[{"a":215,"b":220}]},{"name":"standard_output_kg","required":true,"transform":{"type":"scalar"},"locs":[{"a":223,"b":242}]},{"name":"wastage_threshold_pct","required":false,"transform":{"type":"scalar"},"locs":[{"a":260,"b":281}]},{"name":"resource_variance_threshold_pct","required":false,"transform":{"type":"scalar"},"locs":[{"a":284,"b":315}]},{"name":"dilution_threshold_pct","required":false,"transform":{"type":"scalar"},"locs":[{"a":318,"b":340}]},{"name":"created_by","required":true,"transform":{"type":"scalar"},"locs":[{"a":351,"b":362}]}],"statement":"INSERT INTO formulas\n    (variant_id, name, notes, standard_output_kg, is_default,\n     wastage_threshold_pct, resource_variance_threshold_pct, dilution_threshold_pct,\n     created_by)\nVALUES (:variant_id!, :name!, :notes, :standard_output_kg!, false,\n        :wastage_threshold_pct, :resource_variance_threshold_pct, :dilution_threshold_pct,\n        :created_by!)\nRETURNING id"};

/**
 * Query generated from SQL:
 * ```
 * INSERT INTO formulas
 *     (variant_id, name, notes, standard_output_kg, is_default,
 *      wastage_threshold_pct, resource_variance_threshold_pct, dilution_threshold_pct,
 *      created_by)
 * VALUES (:variant_id!, :name!, :notes, :standard_output_kg!, false,
 *         :wastage_threshold_pct, :resource_variance_threshold_pct, :dilution_threshold_pct,
 *         :created_by!)
 * RETURNING id
 * ```
 */
export const insertFormulaCopy = new PreparedQuery<IInsertFormulaCopyParams,IInsertFormulaCopyResult>(insertFormulaCopyIR);


/** 'CopyFormulaIngredients' parameters type */
export interface ICopyFormulaIngredientsParams {
  new_id: number;
  source_id: number;
}

/** 'CopyFormulaIngredients' return type */
export type ICopyFormulaIngredientsResult = void;

/** 'CopyFormulaIngredients' query type */
export interface ICopyFormulaIngredientsQuery {
  params: ICopyFormulaIngredientsParams;
  result: ICopyFormulaIngredientsResult;
}

const copyFormulaIngredientsIR: any = {"usedParamSet":{"new_id":true,"source_id":true},"params":[{"name":"new_id","required":true,"transform":{"type":"scalar"},"locs":[{"a":76,"b":83}]},{"name":"source_id","required":true,"transform":{"type":"scalar"},"locs":[{"a":153,"b":163}]}],"statement":"INSERT INTO formula_resources (formula_id, resource_id, quantity_kg)\nSELECT :new_id!, resource_id, quantity_kg FROM formula_resources WHERE formula_id = :source_id!"};

/**
 * Query generated from SQL:
 * ```
 * INSERT INTO formula_resources (formula_id, resource_id, quantity_kg)
 * SELECT :new_id!, resource_id, quantity_kg FROM formula_resources WHERE formula_id = :source_id!
 * ```
 */
export const copyFormulaIngredients = new PreparedQuery<ICopyFormulaIngredientsParams,ICopyFormulaIngredientsResult>(copyFormulaIngredientsIR);


/** 'PatchFormula' parameters type */
export interface IPatchFormulaParams {
  clear_dilution?: boolean | null | void;
  clear_variance?: boolean | null | void;
  clear_wastage?: boolean | null | void;
  dilution_threshold_pct?: NumberOrString | null | void;
  id: number;
  name?: string | null | void;
  notes?: string | null | void;
  resource_variance_threshold_pct?: NumberOrString | null | void;
  standard_output_kg?: NumberOrString | null | void;
  wastage_threshold_pct?: NumberOrString | null | void;
}

/** 'PatchFormula' return type */
export interface IPatchFormulaResult {
  id: number;
}

/** 'PatchFormula' query type */
export interface IPatchFormulaQuery {
  params: IPatchFormulaParams;
  result: IPatchFormulaResult;
}

const patchFormulaIR: any = {"usedParamSet":{"name":true,"notes":true,"standard_output_kg":true,"clear_wastage":true,"wastage_threshold_pct":true,"clear_variance":true,"resource_variance_threshold_pct":true,"clear_dilution":true,"dilution_threshold_pct":true,"id":true},"params":[{"name":"name","required":false,"transform":{"type":"scalar"},"locs":[{"a":66,"b":70}]},{"name":"notes","required":false,"transform":{"type":"scalar"},"locs":[{"a":130,"b":135}]},{"name":"standard_output_kg","required":false,"transform":{"type":"scalar"},"locs":[{"a":196,"b":214}]},{"name":"clear_wastage","required":false,"transform":{"type":"scalar"},"locs":[{"a":289,"b":302}]},{"name":"wastage_threshold_pct","required":false,"transform":{"type":"scalar"},"locs":[{"a":337,"b":358}]},{"name":"clear_variance","required":false,"transform":{"type":"scalar"},"locs":[{"a":460,"b":474}]},{"name":"resource_variance_threshold_pct","required":false,"transform":{"type":"scalar"},"locs":[{"a":508,"b":539}]},{"name":"clear_dilution","required":false,"transform":{"type":"scalar"},"locs":[{"a":631,"b":645}]},{"name":"dilution_threshold_pct","required":false,"transform":{"type":"scalar"},"locs":[{"a":679,"b":701}]},{"name":"id","required":true,"transform":{"type":"scalar"},"locs":[{"a":822,"b":825}]}],"statement":"UPDATE formulas\n   SET name                            = COALESCE(:name, name),\n       notes                           = COALESCE(:notes, notes),\n       standard_output_kg              = COALESCE(:standard_output_kg, standard_output_kg),\n       wastage_threshold_pct           = CASE WHEN :clear_wastage::bool    THEN NULL ELSE COALESCE(:wastage_threshold_pct,           wastage_threshold_pct)           END,\n       resource_variance_threshold_pct = CASE WHEN :clear_variance::bool   THEN NULL ELSE COALESCE(:resource_variance_threshold_pct, resource_variance_threshold_pct) END,\n       dilution_threshold_pct          = CASE WHEN :clear_dilution::bool   THEN NULL ELSE COALESCE(:dilution_threshold_pct,          dilution_threshold_pct)          END,\n       updated_at                      = CURRENT_TIMESTAMP\n WHERE id = :id!\n RETURNING id"};

/**
 * Query generated from SQL:
 * ```
 * UPDATE formulas
 *    SET name                            = COALESCE(:name, name),
 *        notes                           = COALESCE(:notes, notes),
 *        standard_output_kg              = COALESCE(:standard_output_kg, standard_output_kg),
 *        wastage_threshold_pct           = CASE WHEN :clear_wastage::bool    THEN NULL ELSE COALESCE(:wastage_threshold_pct,           wastage_threshold_pct)           END,
 *        resource_variance_threshold_pct = CASE WHEN :clear_variance::bool   THEN NULL ELSE COALESCE(:resource_variance_threshold_pct, resource_variance_threshold_pct) END,
 *        dilution_threshold_pct          = CASE WHEN :clear_dilution::bool   THEN NULL ELSE COALESCE(:dilution_threshold_pct,          dilution_threshold_pct)          END,
 *        updated_at                      = CURRENT_TIMESTAMP
 *  WHERE id = :id!
 *  RETURNING id
 * ```
 */
export const patchFormula = new PreparedQuery<IPatchFormulaParams,IPatchFormulaResult>(patchFormulaIR);


/** 'DeleteFormulaIngredients' parameters type */
export interface IDeleteFormulaIngredientsParams {
  formula_id: number;
}

/** 'DeleteFormulaIngredients' return type */
export type IDeleteFormulaIngredientsResult = void;

/** 'DeleteFormulaIngredients' query type */
export interface IDeleteFormulaIngredientsQuery {
  params: IDeleteFormulaIngredientsParams;
  result: IDeleteFormulaIngredientsResult;
}

const deleteFormulaIngredientsIR: any = {"usedParamSet":{"formula_id":true},"params":[{"name":"formula_id","required":true,"transform":{"type":"scalar"},"locs":[{"a":49,"b":60}]}],"statement":"DELETE FROM formula_resources WHERE formula_id = :formula_id!"};

/**
 * Query generated from SQL:
 * ```
 * DELETE FROM formula_resources WHERE formula_id = :formula_id!
 * ```
 */
export const deleteFormulaIngredients = new PreparedQuery<IDeleteFormulaIngredientsParams,IDeleteFormulaIngredientsResult>(deleteFormulaIngredientsIR);


/** 'InsertFormulaIngredient' parameters type */
export interface IInsertFormulaIngredientParams {
  formula_id: number;
  quantity_kg: NumberOrString;
  resource_id: number;
}

/** 'InsertFormulaIngredient' return type */
export type IInsertFormulaIngredientResult = void;

/** 'InsertFormulaIngredient' query type */
export interface IInsertFormulaIngredientQuery {
  params: IInsertFormulaIngredientParams;
  result: IInsertFormulaIngredientResult;
}

const insertFormulaIngredientIR: any = {"usedParamSet":{"formula_id":true,"resource_id":true,"quantity_kg":true},"params":[{"name":"formula_id","required":true,"transform":{"type":"scalar"},"locs":[{"a":77,"b":88}]},{"name":"resource_id","required":true,"transform":{"type":"scalar"},"locs":[{"a":91,"b":103}]},{"name":"quantity_kg","required":true,"transform":{"type":"scalar"},"locs":[{"a":106,"b":118}]}],"statement":"INSERT INTO formula_resources (formula_id, resource_id, quantity_kg)\nVALUES (:formula_id!, :resource_id!, :quantity_kg!)"};

/**
 * Query generated from SQL:
 * ```
 * INSERT INTO formula_resources (formula_id, resource_id, quantity_kg)
 * VALUES (:formula_id!, :resource_id!, :quantity_kg!)
 * ```
 */
export const insertFormulaIngredient = new PreparedQuery<IInsertFormulaIngredientParams,IInsertFormulaIngredientResult>(insertFormulaIngredientIR);


/** 'FormulaExists' parameters type */
export interface IFormulaExistsParams {
  id: number;
}

/** 'FormulaExists' return type */
export interface IFormulaExistsResult {
  one: number | null;
}

/** 'FormulaExists' query type */
export interface IFormulaExistsQuery {
  params: IFormulaExistsParams;
  result: IFormulaExistsResult;
}

const formulaExistsIR: any = {"usedParamSet":{"id":true},"params":[{"name":"id","required":true,"transform":{"type":"scalar"},"locs":[{"a":41,"b":44}]}],"statement":"SELECT 1 AS one FROM formulas WHERE id = :id!"};

/**
 * Query generated from SQL:
 * ```
 * SELECT 1 AS one FROM formulas WHERE id = :id!
 * ```
 */
export const formulaExists = new PreparedQuery<IFormulaExistsParams,IFormulaExistsResult>(formulaExistsIR);


/** 'GetFormulaVariant' parameters type */
export interface IGetFormulaVariantParams {
  id: number;
}

/** 'GetFormulaVariant' return type */
export interface IGetFormulaVariantResult {
  variant_id: number;
}

/** 'GetFormulaVariant' query type */
export interface IGetFormulaVariantQuery {
  params: IGetFormulaVariantParams;
  result: IGetFormulaVariantResult;
}

const getFormulaVariantIR: any = {"usedParamSet":{"id":true},"params":[{"name":"id","required":true,"transform":{"type":"scalar"},"locs":[{"a":43,"b":46}]}],"statement":"SELECT variant_id FROM formulas WHERE id = :id! AND archived_at IS NULL"};

/**
 * Query generated from SQL:
 * ```
 * SELECT variant_id FROM formulas WHERE id = :id! AND archived_at IS NULL
 * ```
 */
export const getFormulaVariant = new PreparedQuery<IGetFormulaVariantParams,IGetFormulaVariantResult>(getFormulaVariantIR);


/** 'SetFormulaDefault' parameters type */
export interface ISetFormulaDefaultParams {
  id: number;
}

/** 'SetFormulaDefault' return type */
export type ISetFormulaDefaultResult = void;

/** 'SetFormulaDefault' query type */
export interface ISetFormulaDefaultQuery {
  params: ISetFormulaDefaultParams;
  result: ISetFormulaDefaultResult;
}

const setFormulaDefaultIR: any = {"usedParamSet":{"id":true},"params":[{"name":"id","required":true,"transform":{"type":"scalar"},"locs":[{"a":49,"b":52}]}],"statement":"UPDATE formulas SET is_default = true WHERE id = :id!"};

/**
 * Query generated from SQL:
 * ```
 * UPDATE formulas SET is_default = true WHERE id = :id!
 * ```
 */
export const setFormulaDefault = new PreparedQuery<ISetFormulaDefaultParams,ISetFormulaDefaultResult>(setFormulaDefaultIR);


/** 'ArchiveFormula' parameters type */
export interface IArchiveFormulaParams {
  id: number;
  user_id: number;
}

/** 'ArchiveFormula' return type */
export interface IArchiveFormulaResult {
  id: number;
}

/** 'ArchiveFormula' query type */
export interface IArchiveFormulaQuery {
  params: IArchiveFormulaParams;
  result: IArchiveFormulaResult;
}

const archiveFormulaIR: any = {"usedParamSet":{"user_id":true,"id":true},"params":[{"name":"user_id","required":true,"transform":{"type":"scalar"},"locs":[{"a":70,"b":78}]},{"name":"id","required":true,"transform":{"type":"scalar"},"locs":[{"a":112,"b":115}]}],"statement":"UPDATE formulas\n   SET archived_at = CURRENT_TIMESTAMP, archived_by = :user_id!, is_default = false\n WHERE id = :id! AND archived_at IS NULL\n RETURNING id"};

/**
 * Query generated from SQL:
 * ```
 * UPDATE formulas
 *    SET archived_at = CURRENT_TIMESTAMP, archived_by = :user_id!, is_default = false
 *  WHERE id = :id! AND archived_at IS NULL
 *  RETURNING id
 * ```
 */
export const archiveFormula = new PreparedQuery<IArchiveFormulaParams,IArchiveFormulaResult>(archiveFormulaIR);


/** 'RestoreFormula' parameters type */
export interface IRestoreFormulaParams {
  id: number;
}

/** 'RestoreFormula' return type */
export interface IRestoreFormulaResult {
  id: number;
}

/** 'RestoreFormula' query type */
export interface IRestoreFormulaQuery {
  params: IRestoreFormulaParams;
  result: IRestoreFormulaResult;
}

const restoreFormulaIR: any = {"usedParamSet":{"id":true},"params":[{"name":"id","required":true,"transform":{"type":"scalar"},"locs":[{"a":70,"b":73}]}],"statement":"UPDATE formulas SET archived_at = NULL, archived_by = NULL WHERE id = :id! RETURNING id"};

/**
 * Query generated from SQL:
 * ```
 * UPDATE formulas SET archived_at = NULL, archived_by = NULL WHERE id = :id! RETURNING id
 * ```
 */
export const restoreFormula = new PreparedQuery<IRestoreFormulaParams,IRestoreFormulaResult>(restoreFormulaIR);


/** 'ListResources' parameters type */
export interface IListResourcesParams {
  include_archived?: boolean | null | void;
  low_stock_only?: boolean | null | void;
  page_offset: NumberOrString;
  page_size: NumberOrString;
  search?: string | null | void;
  search_exact?: string | null | void;
}

/** 'ListResources' return type */
export interface IListResourcesResult {
  _total: string | null;
  aliases: unknown;
  archived_at: Date | null;
  created_at: Date;
  current_stock_kg: string;
  description: string | null;
  id: number;
  import_source: string | null;
  low_stock_threshold_kg: string | null;
  name: string;
  updated_at: Date;
  weighted_avg_cost_per_kg: string;
}

/** 'ListResources' query type */
export interface IListResourcesQuery {
  params: IListResourcesParams;
  result: IListResourcesResult;
}

const listResourcesIR: any = {"usedParamSet":{"include_archived":true,"search":true,"search_exact":true,"low_stock_only":true,"page_size":true,"page_offset":true},"params":[{"name":"include_archived","required":false,"transform":{"type":"scalar"},"locs":[{"a":256,"b":272}]},{"name":"search","required":false,"transform":{"type":"scalar"},"locs":[{"a":314,"b":320},{"a":352,"b":358}]},{"name":"search_exact","required":false,"transform":{"type":"scalar"},"locs":[{"a":391,"b":403}]},{"name":"low_stock_only","required":false,"transform":{"type":"scalar"},"locs":[{"a":426,"b":440}]},{"name":"page_size","required":true,"transform":{"type":"scalar"},"locs":[{"a":682,"b":692}]},{"name":"page_offset","required":true,"transform":{"type":"scalar"},"locs":[{"a":701,"b":713}]}],"statement":"SELECT r.id, r.name, r.description, r.aliases, r.import_source,\n       r.current_stock_kg, r.weighted_avg_cost_per_kg,\n       r.low_stock_threshold_kg, r.archived_at, r.created_at, r.updated_at,\n       COUNT(*) OVER () AS _total\n  FROM resources r\n WHERE (:include_archived::bool OR r.archived_at IS NULL)\n   AND (:search::text IS NULL OR r.name ILIKE :search OR r.aliases @> to_jsonb(ARRAY[:search_exact::text]))\n   AND (NOT :low_stock_only::bool OR r.current_stock_kg < COALESCE(\n            r.low_stock_threshold_kg,\n            (SELECT NULLIF(value->>'kg','')::numeric FROM app_settings WHERE key = 'low_stock_threshold_kg'),\n            0\n       ))\n ORDER BY r.name ASC\n LIMIT :page_size! OFFSET :page_offset!"};

/**
 * Query generated from SQL:
 * ```
 * SELECT r.id, r.name, r.description, r.aliases, r.import_source,
 *        r.current_stock_kg, r.weighted_avg_cost_per_kg,
 *        r.low_stock_threshold_kg, r.archived_at, r.created_at, r.updated_at,
 *        COUNT(*) OVER () AS _total
 *   FROM resources r
 *  WHERE (:include_archived::bool OR r.archived_at IS NULL)
 *    AND (:search::text IS NULL OR r.name ILIKE :search OR r.aliases @> to_jsonb(ARRAY[:search_exact::text]))
 *    AND (NOT :low_stock_only::bool OR r.current_stock_kg < COALESCE(
 *             r.low_stock_threshold_kg,
 *             (SELECT NULLIF(value->>'kg','')::numeric FROM app_settings WHERE key = 'low_stock_threshold_kg'),
 *             0
 *        ))
 *  ORDER BY r.name ASC
 *  LIMIT :page_size! OFFSET :page_offset!
 * ```
 */
export const listResources = new PreparedQuery<IListResourcesParams,IListResourcesResult>(listResourcesIR);


/** 'GetResource' parameters type */
export interface IGetResourceParams {
  id: number;
}

/** 'GetResource' return type */
export interface IGetResourceResult {
  aliases: unknown;
  archived_at: Date | null;
  created_at: Date;
  current_stock_kg: string;
  description: string | null;
  id: number;
  import_source: string | null;
  low_stock_threshold_kg: string | null;
  name: string;
  updated_at: Date;
  weighted_avg_cost_per_kg: string;
}

/** 'GetResource' query type */
export interface IGetResourceQuery {
  params: IGetResourceParams;
  result: IGetResourceResult;
}

const getResourceIR: any = {"usedParamSet":{"id":true},"params":[{"name":"id","required":true,"transform":{"type":"scalar"},"locs":[{"a":200,"b":203}]}],"statement":"SELECT id, name, description, aliases, import_source,\n       current_stock_kg, weighted_avg_cost_per_kg,\n       low_stock_threshold_kg, archived_at, created_at, updated_at\n  FROM resources WHERE id = :id!"};

/**
 * Query generated from SQL:
 * ```
 * SELECT id, name, description, aliases, import_source,
 *        current_stock_kg, weighted_avg_cost_per_kg,
 *        low_stock_threshold_kg, archived_at, created_at, updated_at
 *   FROM resources WHERE id = :id!
 * ```
 */
export const getResource = new PreparedQuery<IGetResourceParams,IGetResourceResult>(getResourceIR);


/** 'ListResourceTransactionsRecent' parameters type */
export interface IListResourceTransactionsRecentParams {
  resource_id: number;
}

/** 'ListResourceTransactionsRecent' return type */
export interface IListResourceTransactionsRecentResult {
  created_at: Date;
  id: string;
  notes: string | null;
  quantity_kg: string;
  reference_id: string | null;
  reference_type: string | null;
  txn_type: string | null;
  unit_cost_per_kg: string | null;
}

/** 'ListResourceTransactionsRecent' query type */
export interface IListResourceTransactionsRecentQuery {
  params: IListResourceTransactionsRecentParams;
  result: IListResourceTransactionsRecentResult;
}

const listResourceTransactionsRecentIR: any = {"usedParamSet":{"resource_id":true},"params":[{"name":"resource_id","required":true,"transform":{"type":"scalar"},"locs":[{"a":181,"b":193}]}],"statement":"SELECT id, txn_type::text AS txn_type, quantity_kg, unit_cost_per_kg,\n       reference_type, reference_id, notes, created_at\n  FROM resource_stock_transactions\n WHERE resource_id = :resource_id!\n ORDER BY created_at DESC\n LIMIT 20"};

/**
 * Query generated from SQL:
 * ```
 * SELECT id, txn_type::text AS txn_type, quantity_kg, unit_cost_per_kg,
 *        reference_type, reference_id, notes, created_at
 *   FROM resource_stock_transactions
 *  WHERE resource_id = :resource_id!
 *  ORDER BY created_at DESC
 *  LIMIT 20
 * ```
 */
export const listResourceTransactionsRecent = new PreparedQuery<IListResourceTransactionsRecentParams,IListResourceTransactionsRecentResult>(listResourceTransactionsRecentIR);


/** 'InsertResource' parameters type */
export interface IInsertResourceParams {
  aliases?: unknown | null | void;
  created_by: number;
  description?: string | null | void;
  import_source?: string | null | void;
  low_stock_threshold_kg?: NumberOrString | null | void;
  name: string;
}

/** 'InsertResource' return type */
export interface IInsertResourceResult {
  id: number;
}

/** 'InsertResource' query type */
export interface IInsertResourceQuery {
  params: IInsertResourceParams;
  result: IInsertResourceResult;
}

const insertResourceIR: any = {"usedParamSet":{"name":true,"description":true,"aliases":true,"import_source":true,"low_stock_threshold_kg":true,"created_by":true},"params":[{"name":"name","required":true,"transform":{"type":"scalar"},"locs":[{"a":110,"b":115}]},{"name":"description","required":false,"transform":{"type":"scalar"},"locs":[{"a":118,"b":129}]},{"name":"aliases","required":false,"transform":{"type":"scalar"},"locs":[{"a":141,"b":148}]},{"name":"import_source","required":false,"transform":{"type":"scalar"},"locs":[{"a":172,"b":185}]},{"name":"low_stock_threshold_kg","required":false,"transform":{"type":"scalar"},"locs":[{"a":188,"b":210}]},{"name":"created_by","required":true,"transform":{"type":"scalar"},"locs":[{"a":213,"b":224}]}],"statement":"INSERT INTO resources (name, description, aliases, import_source, low_stock_threshold_kg, created_by)\nVALUES (:name!, :description, COALESCE(:aliases::jsonb, '[]'::jsonb), :import_source, :low_stock_threshold_kg, :created_by!)\nRETURNING id"};

/**
 * Query generated from SQL:
 * ```
 * INSERT INTO resources (name, description, aliases, import_source, low_stock_threshold_kg, created_by)
 * VALUES (:name!, :description, COALESCE(:aliases::jsonb, '[]'::jsonb), :import_source, :low_stock_threshold_kg, :created_by!)
 * RETURNING id
 * ```
 */
export const insertResource = new PreparedQuery<IInsertResourceParams,IInsertResourceResult>(insertResourceIR);


/** 'PatchResource' parameters type */
export interface IPatchResourceParams {
  aliases?: unknown | null | void;
  clear_threshold?: boolean | null | void;
  description?: string | null | void;
  id: number;
  import_source?: string | null | void;
  low_stock_threshold_kg?: NumberOrString | null | void;
  name?: string | null | void;
}

/** 'PatchResource' return type */
export interface IPatchResourceResult {
  id: number;
}

/** 'PatchResource' query type */
export interface IPatchResourceQuery {
  params: IPatchResourceParams;
  result: IPatchResourceResult;
}

const patchResourceIR: any = {"usedParamSet":{"name":true,"description":true,"aliases":true,"import_source":true,"clear_threshold":true,"low_stock_threshold_kg":true,"id":true},"params":[{"name":"name","required":false,"transform":{"type":"scalar"},"locs":[{"a":58,"b":62}]},{"name":"description","required":false,"transform":{"type":"scalar"},"locs":[{"a":113,"b":124}]},{"name":"aliases","required":false,"transform":{"type":"scalar"},"locs":[{"a":182,"b":189}]},{"name":"import_source","required":false,"transform":{"type":"scalar"},"locs":[{"a":250,"b":263}]},{"name":"clear_threshold","required":false,"transform":{"type":"scalar"},"locs":[{"a":324,"b":339}]},{"name":"low_stock_threshold_kg","required":false,"transform":{"type":"scalar"},"locs":[{"a":371,"b":393}]},{"name":"id","required":true,"transform":{"type":"scalar"},"locs":[{"a":487,"b":490}]}],"statement":"UPDATE resources\n   SET name                   = COALESCE(:name, name),\n       description            = COALESCE(:description, description),\n       aliases                = COALESCE(:aliases::jsonb, aliases),\n       import_source          = COALESCE(:import_source, import_source),\n       low_stock_threshold_kg = CASE WHEN :clear_threshold::bool THEN NULL ELSE COALESCE(:low_stock_threshold_kg, low_stock_threshold_kg) END,\n       updated_at             = CURRENT_TIMESTAMP\n WHERE id = :id!\n RETURNING id"};

/**
 * Query generated from SQL:
 * ```
 * UPDATE resources
 *    SET name                   = COALESCE(:name, name),
 *        description            = COALESCE(:description, description),
 *        aliases                = COALESCE(:aliases::jsonb, aliases),
 *        import_source          = COALESCE(:import_source, import_source),
 *        low_stock_threshold_kg = CASE WHEN :clear_threshold::bool THEN NULL ELSE COALESCE(:low_stock_threshold_kg, low_stock_threshold_kg) END,
 *        updated_at             = CURRENT_TIMESTAMP
 *  WHERE id = :id!
 *  RETURNING id
 * ```
 */
export const patchResource = new PreparedQuery<IPatchResourceParams,IPatchResourceResult>(patchResourceIR);


/** 'ArchiveResource' parameters type */
export interface IArchiveResourceParams {
  id: number;
  user_id: number;
}

/** 'ArchiveResource' return type */
export interface IArchiveResourceResult {
  id: number;
}

/** 'ArchiveResource' query type */
export interface IArchiveResourceQuery {
  params: IArchiveResourceParams;
  result: IArchiveResourceResult;
}

const archiveResourceIR: any = {"usedParamSet":{"user_id":true,"id":true},"params":[{"name":"user_id","required":true,"transform":{"type":"scalar"},"locs":[{"a":68,"b":76}]},{"name":"id","required":true,"transform":{"type":"scalar"},"locs":[{"a":90,"b":93}]}],"statement":"UPDATE resources SET archived_at = CURRENT_TIMESTAMP, archived_by = :user_id!\n WHERE id = :id! AND archived_at IS NULL RETURNING id"};

/**
 * Query generated from SQL:
 * ```
 * UPDATE resources SET archived_at = CURRENT_TIMESTAMP, archived_by = :user_id!
 *  WHERE id = :id! AND archived_at IS NULL RETURNING id
 * ```
 */
export const archiveResource = new PreparedQuery<IArchiveResourceParams,IArchiveResourceResult>(archiveResourceIR);


/** 'RestoreResource' parameters type */
export interface IRestoreResourceParams {
  id: number;
}

/** 'RestoreResource' return type */
export interface IRestoreResourceResult {
  id: number;
}

/** 'RestoreResource' query type */
export interface IRestoreResourceQuery {
  params: IRestoreResourceParams;
  result: IRestoreResourceResult;
}

const restoreResourceIR: any = {"usedParamSet":{"id":true},"params":[{"name":"id","required":true,"transform":{"type":"scalar"},"locs":[{"a":71,"b":74}]}],"statement":"UPDATE resources SET archived_at = NULL, archived_by = NULL WHERE id = :id! RETURNING id"};

/**
 * Query generated from SQL:
 * ```
 * UPDATE resources SET archived_at = NULL, archived_by = NULL WHERE id = :id! RETURNING id
 * ```
 */
export const restoreResource = new PreparedQuery<IRestoreResourceParams,IRestoreResourceResult>(restoreResourceIR);


/** 'ListCustomers' parameters type */
export interface IListCustomersParams {
  include_archived?: boolean | null | void;
  page_offset: NumberOrString;
  page_size: NumberOrString;
  search?: string | null | void;
}

/** 'ListCustomers' return type */
export interface IListCustomersResult {
  _total: string | null;
  archived_at: Date | null;
  contact_email: string | null;
  contact_name: string | null;
  contact_phone: string | null;
  created_at: Date;
  default_currency: string;
  gst_number: string | null;
  id: number;
  name: string;
}

/** 'ListCustomers' query type */
export interface IListCustomersQuery {
  params: IListCustomersParams;
  result: IListCustomersResult;
}

const listCustomersIR: any = {"usedParamSet":{"include_archived":true,"search":true,"page_size":true,"page_offset":true},"params":[{"name":"include_archived","required":false,"transform":{"type":"scalar"},"locs":[{"a":202,"b":218}]},{"name":"search","required":false,"transform":{"type":"scalar"},"locs":[{"a":260,"b":266},{"a":298,"b":304},{"a":331,"b":337},{"a":361,"b":367}]},{"name":"page_size","required":true,"transform":{"type":"scalar"},"locs":[{"a":398,"b":408}]},{"name":"page_offset","required":true,"transform":{"type":"scalar"},"locs":[{"a":417,"b":429}]}],"statement":"SELECT c.id, c.name, c.contact_name, c.contact_phone, c.contact_email,\n       c.gst_number, c.default_currency, c.archived_at, c.created_at,\n       COUNT(*) OVER () AS _total\n  FROM customers c\n WHERE (:include_archived::bool OR c.archived_at IS NULL)\n   AND (:search::text IS NULL OR c.name ILIKE :search OR c.contact_email ILIKE :search OR c.gst_number ILIKE :search)\n ORDER BY c.name ASC\n LIMIT :page_size! OFFSET :page_offset!"};

/**
 * Query generated from SQL:
 * ```
 * SELECT c.id, c.name, c.contact_name, c.contact_phone, c.contact_email,
 *        c.gst_number, c.default_currency, c.archived_at, c.created_at,
 *        COUNT(*) OVER () AS _total
 *   FROM customers c
 *  WHERE (:include_archived::bool OR c.archived_at IS NULL)
 *    AND (:search::text IS NULL OR c.name ILIKE :search OR c.contact_email ILIKE :search OR c.gst_number ILIKE :search)
 *  ORDER BY c.name ASC
 *  LIMIT :page_size! OFFSET :page_offset!
 * ```
 */
export const listCustomers = new PreparedQuery<IListCustomersParams,IListCustomersResult>(listCustomersIR);


/** 'GetCustomer' parameters type */
export interface IGetCustomerParams {
  id: number;
}

/** 'GetCustomer' return type */
export interface IGetCustomerResult {
  archived_at: Date | null;
  billing_address: string | null;
  contact_email: string | null;
  contact_name: string | null;
  contact_phone: string | null;
  created_at: Date;
  default_currency: string;
  gst_number: string | null;
  id: number;
  name: string;
  notes: string | null;
  shipping_addresses: unknown | null;
  updated_at: Date;
}

/** 'GetCustomer' query type */
export interface IGetCustomerQuery {
  params: IGetCustomerParams;
  result: IGetCustomerResult;
}

const getCustomerIR: any = {"usedParamSet":{"id":true},"params":[{"name":"id","required":true,"transform":{"type":"scalar"},"locs":[{"a":558,"b":561}]}],"statement":"SELECT c.id, c.name, c.contact_name, c.contact_phone, c.contact_email,\n       c.billing_address, c.gst_number, c.default_currency, c.notes,\n       c.archived_at, c.created_at, c.updated_at,\n       COALESCE((\n           SELECT jsonb_agg(jsonb_build_object(\n               'id', sa.id, 'label', sa.label, 'address', sa.address, 'is_default', sa.is_default\n           ) ORDER BY sa.is_default DESC, sa.label)\n           FROM customer_shipping_addresses sa WHERE sa.customer_id = c.id\n       ), '[]'::jsonb) AS shipping_addresses\n  FROM customers c WHERE c.id = :id!"};

/**
 * Query generated from SQL:
 * ```
 * SELECT c.id, c.name, c.contact_name, c.contact_phone, c.contact_email,
 *        c.billing_address, c.gst_number, c.default_currency, c.notes,
 *        c.archived_at, c.created_at, c.updated_at,
 *        COALESCE((
 *            SELECT jsonb_agg(jsonb_build_object(
 *                'id', sa.id, 'label', sa.label, 'address', sa.address, 'is_default', sa.is_default
 *            ) ORDER BY sa.is_default DESC, sa.label)
 *            FROM customer_shipping_addresses sa WHERE sa.customer_id = c.id
 *        ), '[]'::jsonb) AS shipping_addresses
 *   FROM customers c WHERE c.id = :id!
 * ```
 */
export const getCustomer = new PreparedQuery<IGetCustomerParams,IGetCustomerResult>(getCustomerIR);


/** 'InsertCustomer' parameters type */
export interface IInsertCustomerParams {
  billing_address?: string | null | void;
  contact_email?: string | null | void;
  contact_name?: string | null | void;
  contact_phone?: string | null | void;
  created_by: number;
  default_currency?: string | null | void;
  gst_number?: string | null | void;
  name: string;
  notes?: string | null | void;
}

/** 'InsertCustomer' return type */
export interface IInsertCustomerResult {
  id: number;
}

/** 'InsertCustomer' query type */
export interface IInsertCustomerQuery {
  params: IInsertCustomerParams;
  result: IInsertCustomerResult;
}

const insertCustomerIR: any = {"usedParamSet":{"name":true,"contact_name":true,"contact_phone":true,"contact_email":true,"billing_address":true,"gst_number":true,"default_currency":true,"notes":true,"created_by":true},"params":[{"name":"name","required":true,"transform":{"type":"scalar"},"locs":[{"a":170,"b":175}]},{"name":"contact_name","required":false,"transform":{"type":"scalar"},"locs":[{"a":178,"b":190}]},{"name":"contact_phone","required":false,"transform":{"type":"scalar"},"locs":[{"a":193,"b":206}]},{"name":"contact_email","required":false,"transform":{"type":"scalar"},"locs":[{"a":209,"b":222}]},{"name":"billing_address","required":false,"transform":{"type":"scalar"},"locs":[{"a":233,"b":248}]},{"name":"gst_number","required":false,"transform":{"type":"scalar"},"locs":[{"a":251,"b":261}]},{"name":"default_currency","required":false,"transform":{"type":"scalar"},"locs":[{"a":273,"b":289}]},{"name":"notes","required":false,"transform":{"type":"scalar"},"locs":[{"a":300,"b":305}]},{"name":"created_by","required":true,"transform":{"type":"scalar"},"locs":[{"a":308,"b":319}]}],"statement":"INSERT INTO customers (name, contact_name, contact_phone, contact_email,\n                       billing_address, gst_number, default_currency, notes, created_by)\nVALUES (:name!, :contact_name, :contact_phone, :contact_email,\n        :billing_address, :gst_number, COALESCE(:default_currency, 'INR'), :notes, :created_by!)\nRETURNING id"};

/**
 * Query generated from SQL:
 * ```
 * INSERT INTO customers (name, contact_name, contact_phone, contact_email,
 *                        billing_address, gst_number, default_currency, notes, created_by)
 * VALUES (:name!, :contact_name, :contact_phone, :contact_email,
 *         :billing_address, :gst_number, COALESCE(:default_currency, 'INR'), :notes, :created_by!)
 * RETURNING id
 * ```
 */
export const insertCustomer = new PreparedQuery<IInsertCustomerParams,IInsertCustomerResult>(insertCustomerIR);


/** 'PatchCustomer' parameters type */
export interface IPatchCustomerParams {
  billing_address?: string | null | void;
  clear_gst?: boolean | null | void;
  contact_email?: string | null | void;
  contact_name?: string | null | void;
  contact_phone?: string | null | void;
  default_currency?: string | null | void;
  gst_number?: string | null | void;
  id: number;
  name?: string | null | void;
  notes?: string | null | void;
}

/** 'PatchCustomer' return type */
export interface IPatchCustomerResult {
  id: number;
}

/** 'PatchCustomer' query type */
export interface IPatchCustomerQuery {
  params: IPatchCustomerParams;
  result: IPatchCustomerResult;
}

const patchCustomerIR: any = {"usedParamSet":{"name":true,"contact_name":true,"contact_phone":true,"contact_email":true,"billing_address":true,"clear_gst":true,"gst_number":true,"default_currency":true,"notes":true,"id":true},"params":[{"name":"name","required":false,"transform":{"type":"scalar"},"locs":[{"a":52,"b":56}]},{"name":"contact_name","required":false,"transform":{"type":"scalar"},"locs":[{"a":101,"b":113}]},{"name":"contact_phone","required":false,"transform":{"type":"scalar"},"locs":[{"a":166,"b":179}]},{"name":"contact_email","required":false,"transform":{"type":"scalar"},"locs":[{"a":233,"b":246}]},{"name":"billing_address","required":false,"transform":{"type":"scalar"},"locs":[{"a":300,"b":315}]},{"name":"clear_gst","required":false,"transform":{"type":"scalar"},"locs":[{"a":372,"b":381}]},{"name":"gst_number","required":false,"transform":{"type":"scalar"},"locs":[{"a":413,"b":423}]},{"name":"default_currency","required":false,"transform":{"type":"scalar"},"locs":[{"a":478,"b":494}]},{"name":"notes","required":false,"transform":{"type":"scalar"},"locs":[{"a":551,"b":556}]},{"name":"id","required":true,"transform":{"type":"scalar"},"locs":[{"a":623,"b":626}]}],"statement":"UPDATE customers\n   SET name             = COALESCE(:name, name),\n       contact_name     = COALESCE(:contact_name, contact_name),\n       contact_phone    = COALESCE(:contact_phone, contact_phone),\n       contact_email    = COALESCE(:contact_email, contact_email),\n       billing_address  = COALESCE(:billing_address, billing_address),\n       gst_number       = CASE WHEN :clear_gst::bool THEN NULL ELSE COALESCE(:gst_number, gst_number) END,\n       default_currency = COALESCE(:default_currency, default_currency),\n       notes            = COALESCE(:notes, notes),\n       updated_at       = CURRENT_TIMESTAMP\n WHERE id = :id!\n RETURNING id"};

/**
 * Query generated from SQL:
 * ```
 * UPDATE customers
 *    SET name             = COALESCE(:name, name),
 *        contact_name     = COALESCE(:contact_name, contact_name),
 *        contact_phone    = COALESCE(:contact_phone, contact_phone),
 *        contact_email    = COALESCE(:contact_email, contact_email),
 *        billing_address  = COALESCE(:billing_address, billing_address),
 *        gst_number       = CASE WHEN :clear_gst::bool THEN NULL ELSE COALESCE(:gst_number, gst_number) END,
 *        default_currency = COALESCE(:default_currency, default_currency),
 *        notes            = COALESCE(:notes, notes),
 *        updated_at       = CURRENT_TIMESTAMP
 *  WHERE id = :id!
 *  RETURNING id
 * ```
 */
export const patchCustomer = new PreparedQuery<IPatchCustomerParams,IPatchCustomerResult>(patchCustomerIR);


/** 'ArchiveCustomer' parameters type */
export interface IArchiveCustomerParams {
  id: number;
  user_id: number;
}

/** 'ArchiveCustomer' return type */
export interface IArchiveCustomerResult {
  id: number;
}

/** 'ArchiveCustomer' query type */
export interface IArchiveCustomerQuery {
  params: IArchiveCustomerParams;
  result: IArchiveCustomerResult;
}

const archiveCustomerIR: any = {"usedParamSet":{"user_id":true,"id":true},"params":[{"name":"user_id","required":true,"transform":{"type":"scalar"},"locs":[{"a":68,"b":76}]},{"name":"id","required":true,"transform":{"type":"scalar"},"locs":[{"a":90,"b":93}]}],"statement":"UPDATE customers SET archived_at = CURRENT_TIMESTAMP, archived_by = :user_id!\n WHERE id = :id! AND archived_at IS NULL RETURNING id"};

/**
 * Query generated from SQL:
 * ```
 * UPDATE customers SET archived_at = CURRENT_TIMESTAMP, archived_by = :user_id!
 *  WHERE id = :id! AND archived_at IS NULL RETURNING id
 * ```
 */
export const archiveCustomer = new PreparedQuery<IArchiveCustomerParams,IArchiveCustomerResult>(archiveCustomerIR);


/** 'RestoreCustomer' parameters type */
export interface IRestoreCustomerParams {
  id: number;
}

/** 'RestoreCustomer' return type */
export interface IRestoreCustomerResult {
  id: number;
}

/** 'RestoreCustomer' query type */
export interface IRestoreCustomerQuery {
  params: IRestoreCustomerParams;
  result: IRestoreCustomerResult;
}

const restoreCustomerIR: any = {"usedParamSet":{"id":true},"params":[{"name":"id","required":true,"transform":{"type":"scalar"},"locs":[{"a":71,"b":74}]}],"statement":"UPDATE customers SET archived_at = NULL, archived_by = NULL WHERE id = :id! RETURNING id"};

/**
 * Query generated from SQL:
 * ```
 * UPDATE customers SET archived_at = NULL, archived_by = NULL WHERE id = :id! RETURNING id
 * ```
 */
export const restoreCustomer = new PreparedQuery<IRestoreCustomerParams,IRestoreCustomerResult>(restoreCustomerIR);


/** 'CustomerExists' parameters type */
export interface ICustomerExistsParams {
  id: number;
}

/** 'CustomerExists' return type */
export interface ICustomerExistsResult {
  one: number | null;
}

/** 'CustomerExists' query type */
export interface ICustomerExistsQuery {
  params: ICustomerExistsParams;
  result: ICustomerExistsResult;
}

const customerExistsIR: any = {"usedParamSet":{"id":true},"params":[{"name":"id","required":true,"transform":{"type":"scalar"},"locs":[{"a":42,"b":45}]}],"statement":"SELECT 1 AS one FROM customers WHERE id = :id!"};

/**
 * Query generated from SQL:
 * ```
 * SELECT 1 AS one FROM customers WHERE id = :id!
 * ```
 */
export const customerExists = new PreparedQuery<ICustomerExistsParams,ICustomerExistsResult>(customerExistsIR);


/** 'ClearDefaultShippingAddress' parameters type */
export interface IClearDefaultShippingAddressParams {
  customer_id: number;
}

/** 'ClearDefaultShippingAddress' return type */
export type IClearDefaultShippingAddressResult = void;

/** 'ClearDefaultShippingAddress' query type */
export interface IClearDefaultShippingAddressQuery {
  params: IClearDefaultShippingAddressParams;
  result: IClearDefaultShippingAddressResult;
}

const clearDefaultShippingAddressIR: any = {"usedParamSet":{"customer_id":true},"params":[{"name":"customer_id","required":true,"transform":{"type":"scalar"},"locs":[{"a":78,"b":90}]}],"statement":"UPDATE customer_shipping_addresses SET is_default = false WHERE customer_id = :customer_id!"};

/**
 * Query generated from SQL:
 * ```
 * UPDATE customer_shipping_addresses SET is_default = false WHERE customer_id = :customer_id!
 * ```
 */
export const clearDefaultShippingAddress = new PreparedQuery<IClearDefaultShippingAddressParams,IClearDefaultShippingAddressResult>(clearDefaultShippingAddressIR);


/** 'InsertShippingAddress' parameters type */
export interface IInsertShippingAddressParams {
  address: string;
  customer_id: number;
  is_default?: boolean | null | void;
  label: string;
}

/** 'InsertShippingAddress' return type */
export interface IInsertShippingAddressResult {
  id: number;
}

/** 'InsertShippingAddress' query type */
export interface IInsertShippingAddressQuery {
  params: IInsertShippingAddressParams;
  result: IInsertShippingAddressResult;
}

const insertShippingAddressIR: any = {"usedParamSet":{"customer_id":true,"label":true,"address":true,"is_default":true},"params":[{"name":"customer_id","required":true,"transform":{"type":"scalar"},"locs":[{"a":90,"b":102}]},{"name":"label","required":true,"transform":{"type":"scalar"},"locs":[{"a":105,"b":111}]},{"name":"address","required":true,"transform":{"type":"scalar"},"locs":[{"a":114,"b":122}]},{"name":"is_default","required":false,"transform":{"type":"scalar"},"locs":[{"a":134,"b":144}]}],"statement":"INSERT INTO customer_shipping_addresses (customer_id, label, address, is_default)\nVALUES (:customer_id!, :label!, :address!, COALESCE(:is_default, false))\nRETURNING id"};

/**
 * Query generated from SQL:
 * ```
 * INSERT INTO customer_shipping_addresses (customer_id, label, address, is_default)
 * VALUES (:customer_id!, :label!, :address!, COALESCE(:is_default, false))
 * RETURNING id
 * ```
 */
export const insertShippingAddress = new PreparedQuery<IInsertShippingAddressParams,IInsertShippingAddressResult>(insertShippingAddressIR);


/** 'GetShippingAddressCustomer' parameters type */
export interface IGetShippingAddressCustomerParams {
  id: number;
}

/** 'GetShippingAddressCustomer' return type */
export interface IGetShippingAddressCustomerResult {
  customer_id: number;
}

/** 'GetShippingAddressCustomer' query type */
export interface IGetShippingAddressCustomerQuery {
  params: IGetShippingAddressCustomerParams;
  result: IGetShippingAddressCustomerResult;
}

const getShippingAddressCustomerIR: any = {"usedParamSet":{"id":true},"params":[{"name":"id","required":true,"transform":{"type":"scalar"},"locs":[{"a":63,"b":66}]}],"statement":"SELECT customer_id FROM customer_shipping_addresses WHERE id = :id!"};

/**
 * Query generated from SQL:
 * ```
 * SELECT customer_id FROM customer_shipping_addresses WHERE id = :id!
 * ```
 */
export const getShippingAddressCustomer = new PreparedQuery<IGetShippingAddressCustomerParams,IGetShippingAddressCustomerResult>(getShippingAddressCustomerIR);


/** 'PatchShippingAddress' parameters type */
export interface IPatchShippingAddressParams {
  address?: string | null | void;
  id: number;
  is_default?: boolean | null | void;
  label?: string | null | void;
}

/** 'PatchShippingAddress' return type */
export type IPatchShippingAddressResult = void;

/** 'PatchShippingAddress' query type */
export interface IPatchShippingAddressQuery {
  params: IPatchShippingAddressParams;
  result: IPatchShippingAddressResult;
}

const patchShippingAddressIR: any = {"usedParamSet":{"label":true,"address":true,"is_default":true,"id":true},"params":[{"name":"label","required":false,"transform":{"type":"scalar"},"locs":[{"a":64,"b":69}]},{"name":"address","required":false,"transform":{"type":"scalar"},"locs":[{"a":109,"b":116}]},{"name":"is_default","required":false,"transform":{"type":"scalar"},"locs":[{"a":158,"b":168}]},{"name":"id","required":true,"transform":{"type":"scalar"},"locs":[{"a":195,"b":198}]}],"statement":"UPDATE customer_shipping_addresses\n   SET label      = COALESCE(:label, label),\n       address    = COALESCE(:address, address),\n       is_default = COALESCE(:is_default, is_default)\n WHERE id = :id!"};

/**
 * Query generated from SQL:
 * ```
 * UPDATE customer_shipping_addresses
 *    SET label      = COALESCE(:label, label),
 *        address    = COALESCE(:address, address),
 *        is_default = COALESCE(:is_default, is_default)
 *  WHERE id = :id!
 * ```
 */
export const patchShippingAddress = new PreparedQuery<IPatchShippingAddressParams,IPatchShippingAddressResult>(patchShippingAddressIR);


/** 'DeleteShippingAddress' parameters type */
export interface IDeleteShippingAddressParams {
  id: number;
}

/** 'DeleteShippingAddress' return type */
export interface IDeleteShippingAddressResult {
  id: number;
}

/** 'DeleteShippingAddress' query type */
export interface IDeleteShippingAddressQuery {
  params: IDeleteShippingAddressParams;
  result: IDeleteShippingAddressResult;
}

const deleteShippingAddressIR: any = {"usedParamSet":{"id":true},"params":[{"name":"id","required":true,"transform":{"type":"scalar"},"locs":[{"a":51,"b":54}]}],"statement":"DELETE FROM customer_shipping_addresses WHERE id = :id! RETURNING id"};

/**
 * Query generated from SQL:
 * ```
 * DELETE FROM customer_shipping_addresses WHERE id = :id! RETURNING id
 * ```
 */
export const deleteShippingAddress = new PreparedQuery<IDeleteShippingAddressParams,IDeleteShippingAddressResult>(deleteShippingAddressIR);


/** 'ListSuppliers' parameters type */
export interface IListSuppliersParams {
  include_archived?: boolean | null | void;
  page_offset: NumberOrString;
  page_size: NumberOrString;
  search?: string | null | void;
}

/** 'ListSuppliers' return type */
export interface IListSuppliersResult {
  _total: string | null;
  archived_at: Date | null;
  contact_name: string | null;
  created_at: Date;
  email: string | null;
  gst_number: string | null;
  id: number;
  name: string;
  phone: string | null;
}

/** 'ListSuppliers' query type */
export interface IListSuppliersQuery {
  params: IListSuppliersParams;
  result: IListSuppliersResult;
}

const listSuppliersIR: any = {"usedParamSet":{"include_archived":true,"search":true,"page_size":true,"page_offset":true},"params":[{"name":"include_archived","required":false,"transform":{"type":"scalar"},"locs":[{"a":166,"b":182}]},{"name":"search","required":false,"transform":{"type":"scalar"},"locs":[{"a":224,"b":230},{"a":262,"b":268},{"a":287,"b":293},{"a":317,"b":323}]},{"name":"page_size","required":true,"transform":{"type":"scalar"},"locs":[{"a":354,"b":364}]},{"name":"page_offset","required":true,"transform":{"type":"scalar"},"locs":[{"a":373,"b":385}]}],"statement":"SELECT s.id, s.name, s.contact_name, s.email, s.phone, s.gst_number,\n       s.archived_at, s.created_at,\n       COUNT(*) OVER () AS _total\n  FROM suppliers s\n WHERE (:include_archived::bool OR s.archived_at IS NULL)\n   AND (:search::text IS NULL OR s.name ILIKE :search OR s.email ILIKE :search OR s.gst_number ILIKE :search)\n ORDER BY s.name ASC\n LIMIT :page_size! OFFSET :page_offset!"};

/**
 * Query generated from SQL:
 * ```
 * SELECT s.id, s.name, s.contact_name, s.email, s.phone, s.gst_number,
 *        s.archived_at, s.created_at,
 *        COUNT(*) OVER () AS _total
 *   FROM suppliers s
 *  WHERE (:include_archived::bool OR s.archived_at IS NULL)
 *    AND (:search::text IS NULL OR s.name ILIKE :search OR s.email ILIKE :search OR s.gst_number ILIKE :search)
 *  ORDER BY s.name ASC
 *  LIMIT :page_size! OFFSET :page_offset!
 * ```
 */
export const listSuppliers = new PreparedQuery<IListSuppliersParams,IListSuppliersResult>(listSuppliersIR);


/** 'GetSupplier' parameters type */
export interface IGetSupplierParams {
  id: number;
}

/** 'GetSupplier' return type */
export interface IGetSupplierResult {
  address: string | null;
  archived_at: Date | null;
  contact_name: string | null;
  created_at: Date;
  email: string | null;
  gst_number: string | null;
  id: number;
  name: string;
  notes: string | null;
  phone: string | null;
  pocs: unknown;
  updated_at: Date;
  website: string | null;
}

/** 'GetSupplier' query type */
export interface IGetSupplierQuery {
  params: IGetSupplierParams;
  result: IGetSupplierResult;
}

const getSupplierIR: any = {"usedParamSet":{"id":true},"params":[{"name":"id","required":true,"transform":{"type":"scalar"},"locs":[{"a":159,"b":162}]}],"statement":"SELECT id, name, contact_name, email, phone, address, website, gst_number,\n       pocs, notes, archived_at, created_at, updated_at\n  FROM suppliers WHERE id = :id!"};

/**
 * Query generated from SQL:
 * ```
 * SELECT id, name, contact_name, email, phone, address, website, gst_number,
 *        pocs, notes, archived_at, created_at, updated_at
 *   FROM suppliers WHERE id = :id!
 * ```
 */
export const getSupplier = new PreparedQuery<IGetSupplierParams,IGetSupplierResult>(getSupplierIR);


/** 'InsertSupplier' parameters type */
export interface IInsertSupplierParams {
  address?: string | null | void;
  contact_name?: string | null | void;
  created_by: number;
  email?: string | null | void;
  gst_number?: string | null | void;
  name: string;
  notes?: string | null | void;
  phone?: string | null | void;
  pocs?: unknown | null | void;
  website?: string | null | void;
}

/** 'InsertSupplier' return type */
export interface IInsertSupplierResult {
  id: number;
}

/** 'InsertSupplier' query type */
export interface IInsertSupplierQuery {
  params: IInsertSupplierParams;
  result: IInsertSupplierResult;
}

const insertSupplierIR: any = {"usedParamSet":{"name":true,"contact_name":true,"email":true,"phone":true,"address":true,"website":true,"gst_number":true,"pocs":true,"notes":true,"created_by":true},"params":[{"name":"name","required":true,"transform":{"type":"scalar"},"locs":[{"a":120,"b":125}]},{"name":"contact_name","required":false,"transform":{"type":"scalar"},"locs":[{"a":128,"b":140}]},{"name":"email","required":false,"transform":{"type":"scalar"},"locs":[{"a":143,"b":148}]},{"name":"phone","required":false,"transform":{"type":"scalar"},"locs":[{"a":151,"b":156}]},{"name":"address","required":false,"transform":{"type":"scalar"},"locs":[{"a":159,"b":166}]},{"name":"website","required":false,"transform":{"type":"scalar"},"locs":[{"a":169,"b":176}]},{"name":"gst_number","required":false,"transform":{"type":"scalar"},"locs":[{"a":179,"b":189}]},{"name":"pocs","required":false,"transform":{"type":"scalar"},"locs":[{"a":209,"b":213}]},{"name":"notes","required":false,"transform":{"type":"scalar"},"locs":[{"a":237,"b":242}]},{"name":"created_by","required":true,"transform":{"type":"scalar"},"locs":[{"a":245,"b":256}]}],"statement":"INSERT INTO suppliers (name, contact_name, email, phone, address, website, gst_number, pocs, notes, created_by)\nVALUES (:name!, :contact_name, :email, :phone, :address, :website, :gst_number,\n        COALESCE(:pocs::jsonb, '[]'::jsonb), :notes, :created_by!)\nRETURNING id"};

/**
 * Query generated from SQL:
 * ```
 * INSERT INTO suppliers (name, contact_name, email, phone, address, website, gst_number, pocs, notes, created_by)
 * VALUES (:name!, :contact_name, :email, :phone, :address, :website, :gst_number,
 *         COALESCE(:pocs::jsonb, '[]'::jsonb), :notes, :created_by!)
 * RETURNING id
 * ```
 */
export const insertSupplier = new PreparedQuery<IInsertSupplierParams,IInsertSupplierResult>(insertSupplierIR);


/** 'PatchSupplier' parameters type */
export interface IPatchSupplierParams {
  address?: string | null | void;
  contact_name?: string | null | void;
  email?: string | null | void;
  gst_number?: string | null | void;
  id: number;
  name?: string | null | void;
  notes?: string | null | void;
  phone?: string | null | void;
  pocs?: unknown | null | void;
  website?: string | null | void;
}

/** 'PatchSupplier' return type */
export interface IPatchSupplierResult {
  id: number;
}

/** 'PatchSupplier' query type */
export interface IPatchSupplierQuery {
  params: IPatchSupplierParams;
  result: IPatchSupplierResult;
}

const patchSupplierIR: any = {"usedParamSet":{"name":true,"contact_name":true,"email":true,"phone":true,"address":true,"website":true,"gst_number":true,"pocs":true,"notes":true,"id":true},"params":[{"name":"name","required":false,"transform":{"type":"scalar"},"locs":[{"a":48,"b":52}]},{"name":"contact_name","required":false,"transform":{"type":"scalar"},"locs":[{"a":93,"b":105}]},{"name":"email","required":false,"transform":{"type":"scalar"},"locs":[{"a":154,"b":159}]},{"name":"phone","required":false,"transform":{"type":"scalar"},"locs":[{"a":201,"b":206}]},{"name":"address","required":false,"transform":{"type":"scalar"},"locs":[{"a":248,"b":255}]},{"name":"website","required":false,"transform":{"type":"scalar"},"locs":[{"a":299,"b":306}]},{"name":"gst_number","required":false,"transform":{"type":"scalar"},"locs":[{"a":350,"b":360}]},{"name":"pocs","required":false,"transform":{"type":"scalar"},"locs":[{"a":407,"b":411}]},{"name":"notes","required":false,"transform":{"type":"scalar"},"locs":[{"a":459,"b":464}]},{"name":"id","required":true,"transform":{"type":"scalar"},"locs":[{"a":527,"b":530}]}],"statement":"UPDATE suppliers\n   SET name         = COALESCE(:name, name),\n       contact_name = COALESCE(:contact_name, contact_name),\n       email        = COALESCE(:email, email),\n       phone        = COALESCE(:phone, phone),\n       address      = COALESCE(:address, address),\n       website      = COALESCE(:website, website),\n       gst_number   = COALESCE(:gst_number, gst_number),\n       pocs         = COALESCE(:pocs::jsonb, pocs),\n       notes        = COALESCE(:notes, notes),\n       updated_at   = CURRENT_TIMESTAMP\n WHERE id = :id!\n RETURNING id"};

/**
 * Query generated from SQL:
 * ```
 * UPDATE suppliers
 *    SET name         = COALESCE(:name, name),
 *        contact_name = COALESCE(:contact_name, contact_name),
 *        email        = COALESCE(:email, email),
 *        phone        = COALESCE(:phone, phone),
 *        address      = COALESCE(:address, address),
 *        website      = COALESCE(:website, website),
 *        gst_number   = COALESCE(:gst_number, gst_number),
 *        pocs         = COALESCE(:pocs::jsonb, pocs),
 *        notes        = COALESCE(:notes, notes),
 *        updated_at   = CURRENT_TIMESTAMP
 *  WHERE id = :id!
 *  RETURNING id
 * ```
 */
export const patchSupplier = new PreparedQuery<IPatchSupplierParams,IPatchSupplierResult>(patchSupplierIR);


/** 'ArchiveSupplier' parameters type */
export interface IArchiveSupplierParams {
  id: number;
  user_id: number;
}

/** 'ArchiveSupplier' return type */
export interface IArchiveSupplierResult {
  id: number;
}

/** 'ArchiveSupplier' query type */
export interface IArchiveSupplierQuery {
  params: IArchiveSupplierParams;
  result: IArchiveSupplierResult;
}

const archiveSupplierIR: any = {"usedParamSet":{"user_id":true,"id":true},"params":[{"name":"user_id","required":true,"transform":{"type":"scalar"},"locs":[{"a":68,"b":76}]},{"name":"id","required":true,"transform":{"type":"scalar"},"locs":[{"a":90,"b":93}]}],"statement":"UPDATE suppliers SET archived_at = CURRENT_TIMESTAMP, archived_by = :user_id!\n WHERE id = :id! AND archived_at IS NULL RETURNING id"};

/**
 * Query generated from SQL:
 * ```
 * UPDATE suppliers SET archived_at = CURRENT_TIMESTAMP, archived_by = :user_id!
 *  WHERE id = :id! AND archived_at IS NULL RETURNING id
 * ```
 */
export const archiveSupplier = new PreparedQuery<IArchiveSupplierParams,IArchiveSupplierResult>(archiveSupplierIR);


/** 'RestoreSupplier' parameters type */
export interface IRestoreSupplierParams {
  id: number;
}

/** 'RestoreSupplier' return type */
export interface IRestoreSupplierResult {
  id: number;
}

/** 'RestoreSupplier' query type */
export interface IRestoreSupplierQuery {
  params: IRestoreSupplierParams;
  result: IRestoreSupplierResult;
}

const restoreSupplierIR: any = {"usedParamSet":{"id":true},"params":[{"name":"id","required":true,"transform":{"type":"scalar"},"locs":[{"a":71,"b":74}]}],"statement":"UPDATE suppliers SET archived_at = NULL, archived_by = NULL WHERE id = :id! RETURNING id"};

/**
 * Query generated from SQL:
 * ```
 * UPDATE suppliers SET archived_at = NULL, archived_by = NULL WHERE id = :id! RETURNING id
 * ```
 */
export const restoreSupplier = new PreparedQuery<IRestoreSupplierParams,IRestoreSupplierResult>(restoreSupplierIR);


/** 'ListAppSettings' parameters type */
export type IListAppSettingsParams = void;

/** 'ListAppSettings' return type */
export interface IListAppSettingsResult {
  key: string;
  updated_at: Date;
  updated_by: number | null;
  value: unknown;
}

/** 'ListAppSettings' query type */
export interface IListAppSettingsQuery {
  params: IListAppSettingsParams;
  result: IListAppSettingsResult;
}

const listAppSettingsIR: any = {"usedParamSet":{},"params":[],"statement":"SELECT key, value, updated_at, updated_by FROM app_settings"};

/**
 * Query generated from SQL:
 * ```
 * SELECT key, value, updated_at, updated_by FROM app_settings
 * ```
 */
export const listAppSettings = new PreparedQuery<IListAppSettingsParams,IListAppSettingsResult>(listAppSettingsIR);


/** 'GetAppSetting' parameters type */
export interface IGetAppSettingParams {
  key: string;
}

/** 'GetAppSetting' return type */
export interface IGetAppSettingResult {
  updated_at: Date;
  updated_by: number | null;
  value: unknown;
}

/** 'GetAppSetting' query type */
export interface IGetAppSettingQuery {
  params: IGetAppSettingParams;
  result: IGetAppSettingResult;
}

const getAppSettingIR: any = {"usedParamSet":{"key":true},"params":[{"name":"key","required":true,"transform":{"type":"scalar"},"locs":[{"a":67,"b":71}]}],"statement":"SELECT value, updated_at, updated_by FROM app_settings WHERE key = :key!"};

/**
 * Query generated from SQL:
 * ```
 * SELECT value, updated_at, updated_by FROM app_settings WHERE key = :key!
 * ```
 */
export const getAppSetting = new PreparedQuery<IGetAppSettingParams,IGetAppSettingResult>(getAppSettingIR);


/** 'UpsertAppSetting' parameters type */
export interface IUpsertAppSettingParams {
  key: string;
  user_id: number;
  value: unknown;
}

/** 'UpsertAppSetting' return type */
export type IUpsertAppSettingResult = void;

/** 'UpsertAppSetting' query type */
export interface IUpsertAppSettingQuery {
  params: IUpsertAppSettingParams;
  result: IUpsertAppSettingResult;
}

const upsertAppSettingIR: any = {"usedParamSet":{"key":true,"value":true,"user_id":true},"params":[{"name":"key","required":true,"transform":{"type":"scalar"},"locs":[{"a":58,"b":62}]},{"name":"value","required":true,"transform":{"type":"scalar"},"locs":[{"a":65,"b":71}]},{"name":"user_id","required":true,"transform":{"type":"scalar"},"locs":[{"a":81,"b":89}]}],"statement":"INSERT INTO app_settings (key, value, updated_by)\nVALUES (:key!, :value!::jsonb, :user_id!)\nON CONFLICT (key) DO UPDATE\n   SET value      = EXCLUDED.value,\n       updated_by = EXCLUDED.updated_by,\n       updated_at = CURRENT_TIMESTAMP"};

/**
 * Query generated from SQL:
 * ```
 * INSERT INTO app_settings (key, value, updated_by)
 * VALUES (:key!, :value!::jsonb, :user_id!)
 * ON CONFLICT (key) DO UPDATE
 *    SET value      = EXCLUDED.value,
 *        updated_by = EXCLUDED.updated_by,
 *        updated_at = CURRENT_TIMESTAMP
 * ```
 */
export const upsertAppSetting = new PreparedQuery<IUpsertAppSettingParams,IUpsertAppSettingResult>(upsertAppSettingIR);


/** 'DeleteAppSetting' parameters type */
export interface IDeleteAppSettingParams {
  key: string;
}

/** 'DeleteAppSetting' return type */
export type IDeleteAppSettingResult = void;

/** 'DeleteAppSetting' query type */
export interface IDeleteAppSettingQuery {
  params: IDeleteAppSettingParams;
  result: IDeleteAppSettingResult;
}

const deleteAppSettingIR: any = {"usedParamSet":{"key":true},"params":[{"name":"key","required":true,"transform":{"type":"scalar"},"locs":[{"a":37,"b":41}]}],"statement":"DELETE FROM app_settings WHERE key = :key!"};

/**
 * Query generated from SQL:
 * ```
 * DELETE FROM app_settings WHERE key = :key!
 * ```
 */
export const deleteAppSetting = new PreparedQuery<IDeleteAppSettingParams,IDeleteAppSettingResult>(deleteAppSettingIR);


/** 'ListPackSizes' parameters type */
export type IListPackSizesParams = void;

/** 'ListPackSizes' return type */
export interface IListPackSizesResult {
  created_at: Date;
  is_active: boolean;
  pack_size_kg: string;
}

/** 'ListPackSizes' query type */
export interface IListPackSizesQuery {
  params: IListPackSizesParams;
  result: IListPackSizesResult;
}

const listPackSizesIR: any = {"usedParamSet":{},"params":[],"statement":"SELECT pack_size_kg, is_active, created_at FROM pack_sizes WHERE is_active ORDER BY pack_size_kg ASC"};

/**
 * Query generated from SQL:
 * ```
 * SELECT pack_size_kg, is_active, created_at FROM pack_sizes WHERE is_active ORDER BY pack_size_kg ASC
 * ```
 */
export const listPackSizes = new PreparedQuery<IListPackSizesParams,IListPackSizesResult>(listPackSizesIR);


/** 'UpsertPackSize' parameters type */
export interface IUpsertPackSizeParams {
  pack_size_kg: NumberOrString;
}

/** 'UpsertPackSize' return type */
export type IUpsertPackSizeResult = void;

/** 'UpsertPackSize' query type */
export interface IUpsertPackSizeQuery {
  params: IUpsertPackSizeParams;
  result: IUpsertPackSizeResult;
}

const upsertPackSizeIR: any = {"usedParamSet":{"pack_size_kg":true},"params":[{"name":"pack_size_kg","required":true,"transform":{"type":"scalar"},"locs":[{"a":57,"b":70}]}],"statement":"INSERT INTO pack_sizes (pack_size_kg, is_active) VALUES (:pack_size_kg!, true)\nON CONFLICT (pack_size_kg) DO UPDATE SET is_active = true"};

/**
 * Query generated from SQL:
 * ```
 * INSERT INTO pack_sizes (pack_size_kg, is_active) VALUES (:pack_size_kg!, true)
 * ON CONFLICT (pack_size_kg) DO UPDATE SET is_active = true
 * ```
 */
export const upsertPackSize = new PreparedQuery<IUpsertPackSizeParams,IUpsertPackSizeResult>(upsertPackSizeIR);


/** 'DisablePackSize' parameters type */
export interface IDisablePackSizeParams {
  pack_size_kg: NumberOrString;
}

/** 'DisablePackSize' return type */
export interface IDisablePackSizeResult {
  pack_size_kg: string;
}

/** 'DisablePackSize' query type */
export interface IDisablePackSizeQuery {
  params: IDisablePackSizeParams;
  result: IDisablePackSizeResult;
}

const disablePackSizeIR: any = {"usedParamSet":{"pack_size_kg":true},"params":[{"name":"pack_size_kg","required":true,"transform":{"type":"scalar"},"locs":[{"a":62,"b":75}]}],"statement":"UPDATE pack_sizes SET is_active = false\n WHERE pack_size_kg = :pack_size_kg! AND is_active\n RETURNING pack_size_kg"};

/**
 * Query generated from SQL:
 * ```
 * UPDATE pack_sizes SET is_active = false
 *  WHERE pack_size_kg = :pack_size_kg! AND is_active
 *  RETURNING pack_size_kg
 * ```
 */
export const disablePackSize = new PreparedQuery<IDisablePackSizeParams,IDisablePackSizeResult>(disablePackSizeIR);


/** 'ListPurchaseOrders' parameters type */
export interface IListPurchaseOrdersParams {
  include_archived?: boolean | null | void;
  page_offset: NumberOrString;
  page_size: NumberOrString;
  status?: po_status | null | void;
  supplier_id?: number | null | void;
}

/** 'ListPurchaseOrders' return type */
export interface IListPurchaseOrdersResult {
  _total: string | null;
  archived_at: Date | null;
  created_at: Date;
  currency: string;
  id: number;
  item_count: string | null;
  notes: string | null;
  ordered_at: Date | null;
  received_at: Date | null;
  shipped_at: Date | null;
  status: string | null;
  supplier_id: number;
  supplier_name: string;
  total_cost: string | null;
}

/** 'ListPurchaseOrders' query type */
export interface IListPurchaseOrdersQuery {
  params: IListPurchaseOrdersParams;
  result: IListPurchaseOrdersResult;
}

const listPurchaseOrdersIR: any = {"usedParamSet":{"include_archived":true,"status":true,"supplier_id":true,"page_size":true,"page_offset":true},"params":[{"name":"include_archived","required":false,"transform":{"type":"scalar"},"locs":[{"a":666,"b":682}]},{"name":"status","required":false,"transform":{"type":"scalar"},"locs":[{"a":725,"b":731},{"a":767,"b":773}]},{"name":"supplier_id","required":false,"transform":{"type":"scalar"},"locs":[{"a":784,"b":795},{"a":831,"b":842}]},{"name":"page_size","required":true,"transform":{"type":"scalar"},"locs":[{"a":905,"b":915}]},{"name":"page_offset","required":true,"transform":{"type":"scalar"},"locs":[{"a":924,"b":936}]}],"statement":"SELECT po.id, po.supplier_id, s.name AS supplier_name,\n       po.status::text AS status, po.currency, po.notes,\n       po.ordered_at, po.shipped_at, po.received_at,\n       po.archived_at, po.created_at,\n       COALESCE(SUM(\n           CASE WHEN poi.kind = 'resource'\n                THEN poi.quantity_kg * poi.landed_cost_per_kg\n                ELSE poi.quantity_packs * poi.pack_size_kg * poi.landed_cost_per_kg\n           END), 0) AS total_cost,\n       COUNT(poi.id) AS item_count,\n       COUNT(*) OVER () AS _total\n  FROM purchase_orders po\n  JOIN suppliers s ON s.id = po.supplier_id\n  LEFT JOIN purchase_order_items poi ON poi.purchase_order_id = po.id\n WHERE (:include_archived::bool OR po.archived_at IS NULL)\n   AND (:status::po_status IS NULL OR po.status = :status)\n   AND (:supplier_id::int  IS NULL OR po.supplier_id = :supplier_id)\n GROUP BY po.id, s.name\n ORDER BY po.created_at DESC\n LIMIT :page_size! OFFSET :page_offset!"};

/**
 * Query generated from SQL:
 * ```
 * SELECT po.id, po.supplier_id, s.name AS supplier_name,
 *        po.status::text AS status, po.currency, po.notes,
 *        po.ordered_at, po.shipped_at, po.received_at,
 *        po.archived_at, po.created_at,
 *        COALESCE(SUM(
 *            CASE WHEN poi.kind = 'resource'
 *                 THEN poi.quantity_kg * poi.landed_cost_per_kg
 *                 ELSE poi.quantity_packs * poi.pack_size_kg * poi.landed_cost_per_kg
 *            END), 0) AS total_cost,
 *        COUNT(poi.id) AS item_count,
 *        COUNT(*) OVER () AS _total
 *   FROM purchase_orders po
 *   JOIN suppliers s ON s.id = po.supplier_id
 *   LEFT JOIN purchase_order_items poi ON poi.purchase_order_id = po.id
 *  WHERE (:include_archived::bool OR po.archived_at IS NULL)
 *    AND (:status::po_status IS NULL OR po.status = :status)
 *    AND (:supplier_id::int  IS NULL OR po.supplier_id = :supplier_id)
 *  GROUP BY po.id, s.name
 *  ORDER BY po.created_at DESC
 *  LIMIT :page_size! OFFSET :page_offset!
 * ```
 */
export const listPurchaseOrders = new PreparedQuery<IListPurchaseOrdersParams,IListPurchaseOrdersResult>(listPurchaseOrdersIR);


/** 'GetPurchaseOrder' parameters type */
export interface IGetPurchaseOrderParams {
  id: number;
}

/** 'GetPurchaseOrder' return type */
export interface IGetPurchaseOrderResult {
  archived_at: Date | null;
  created_at: Date;
  currency: string;
  id: number;
  items: unknown | null;
  notes: string | null;
  ordered_at: Date | null;
  received_at: Date | null;
  share_token: string;
  shipped_at: Date | null;
  status: string | null;
  supplier_id: number;
  supplier_name: string;
  updated_at: Date;
}

/** 'GetPurchaseOrder' query type */
export interface IGetPurchaseOrderQuery {
  params: IGetPurchaseOrderParams;
  result: IGetPurchaseOrderResult;
}

const getPurchaseOrderIR: any = {"usedParamSet":{"id":true},"params":[{"name":"id","required":true,"transform":{"type":"scalar"},"locs":[{"a":1434,"b":1437}]}],"statement":"SELECT po.id, po.supplier_id, s.name AS supplier_name,\n       po.status::text AS status, po.currency, po.notes, po.share_token,\n       po.ordered_at, po.shipped_at, po.received_at,\n       po.archived_at, po.created_at, po.updated_at,\n       COALESCE((\n           SELECT jsonb_agg(jsonb_build_object(\n               'id',                  i.id,\n               'kind',                i.kind,\n               'resource_id',         i.resource_id,\n               'resource_name',       r.name,\n               'variant_id',          i.variant_id,\n               'paint_name',          p.name,\n               'classification',      v.classification,\n               'ink_series',          v.ink_series,\n               'pack_size_kg',        i.pack_size_kg,\n               'quantity_kg',         i.quantity_kg,\n               'quantity_packs',      i.quantity_packs,\n               'landed_cost_per_kg',  i.landed_cost_per_kg,\n               'received_quantity_kg', i.received_quantity_kg,\n               'received_packs',      i.received_packs\n           ) ORDER BY i.id)\n           FROM purchase_order_items i\n           LEFT JOIN resources r ON r.id = i.resource_id\n           LEFT JOIN paint_variants v ON v.id = i.variant_id\n           LEFT JOIN paints p ON p.id = v.paint_id\n           WHERE i.purchase_order_id = po.id\n       ), '[]'::jsonb) AS items\n  FROM purchase_orders po\n  JOIN suppliers s ON s.id = po.supplier_id\n WHERE po.id = :id!"};

/**
 * Query generated from SQL:
 * ```
 * SELECT po.id, po.supplier_id, s.name AS supplier_name,
 *        po.status::text AS status, po.currency, po.notes, po.share_token,
 *        po.ordered_at, po.shipped_at, po.received_at,
 *        po.archived_at, po.created_at, po.updated_at,
 *        COALESCE((
 *            SELECT jsonb_agg(jsonb_build_object(
 *                'id',                  i.id,
 *                'kind',                i.kind,
 *                'resource_id',         i.resource_id,
 *                'resource_name',       r.name,
 *                'variant_id',          i.variant_id,
 *                'paint_name',          p.name,
 *                'classification',      v.classification,
 *                'ink_series',          v.ink_series,
 *                'pack_size_kg',        i.pack_size_kg,
 *                'quantity_kg',         i.quantity_kg,
 *                'quantity_packs',      i.quantity_packs,
 *                'landed_cost_per_kg',  i.landed_cost_per_kg,
 *                'received_quantity_kg', i.received_quantity_kg,
 *                'received_packs',      i.received_packs
 *            ) ORDER BY i.id)
 *            FROM purchase_order_items i
 *            LEFT JOIN resources r ON r.id = i.resource_id
 *            LEFT JOIN paint_variants v ON v.id = i.variant_id
 *            LEFT JOIN paints p ON p.id = v.paint_id
 *            WHERE i.purchase_order_id = po.id
 *        ), '[]'::jsonb) AS items
 *   FROM purchase_orders po
 *   JOIN suppliers s ON s.id = po.supplier_id
 *  WHERE po.id = :id!
 * ```
 */
export const getPurchaseOrder = new PreparedQuery<IGetPurchaseOrderParams,IGetPurchaseOrderResult>(getPurchaseOrderIR);


/** 'InsertPurchaseOrder' parameters type */
export interface IInsertPurchaseOrderParams {
  currency?: string | null | void;
  notes?: string | null | void;
  supplier_id: number;
  user_id: number;
}

/** 'InsertPurchaseOrder' return type */
export interface IInsertPurchaseOrderResult {
  id: number;
}

/** 'InsertPurchaseOrder' query type */
export interface IInsertPurchaseOrderQuery {
  params: IInsertPurchaseOrderParams;
  result: IInsertPurchaseOrderResult;
}

const insertPurchaseOrderIR: any = {"usedParamSet":{"supplier_id":true,"currency":true,"notes":true,"user_id":true},"params":[{"name":"supplier_id","required":true,"transform":{"type":"scalar"},"locs":[{"a":79,"b":91}]},{"name":"currency","required":false,"transform":{"type":"scalar"},"locs":[{"a":103,"b":111}]},{"name":"notes","required":false,"transform":{"type":"scalar"},"locs":[{"a":122,"b":127}]},{"name":"user_id","required":true,"transform":{"type":"scalar"},"locs":[{"a":130,"b":138}]}],"statement":"INSERT INTO purchase_orders (supplier_id, currency, notes, created_by)\nVALUES (:supplier_id!, COALESCE(:currency, 'INR'), :notes, :user_id!)\nRETURNING id"};

/**
 * Query generated from SQL:
 * ```
 * INSERT INTO purchase_orders (supplier_id, currency, notes, created_by)
 * VALUES (:supplier_id!, COALESCE(:currency, 'INR'), :notes, :user_id!)
 * RETURNING id
 * ```
 */
export const insertPurchaseOrder = new PreparedQuery<IInsertPurchaseOrderParams,IInsertPurchaseOrderResult>(insertPurchaseOrderIR);


/** 'InsertPurchaseOrderItem' parameters type */
export interface IInsertPurchaseOrderItemParams {
  kind: po_line_kind;
  landed_cost_per_kg: NumberOrString;
  pack_size_kg?: NumberOrString | null | void;
  po_id: number;
  quantity_kg?: NumberOrString | null | void;
  quantity_packs?: number | null | void;
  resource_id?: number | null | void;
  variant_id?: number | null | void;
}

/** 'InsertPurchaseOrderItem' return type */
export interface IInsertPurchaseOrderItemResult {
  id: number;
}

/** 'InsertPurchaseOrderItem' query type */
export interface IInsertPurchaseOrderItemQuery {
  params: IInsertPurchaseOrderItemParams;
  result: IInsertPurchaseOrderItemResult;
}

const insertPurchaseOrderItemIR: any = {"usedParamSet":{"po_id":true,"kind":true,"resource_id":true,"variant_id":true,"pack_size_kg":true,"quantity_kg":true,"quantity_packs":true,"landed_cost_per_kg":true},"params":[{"name":"po_id","required":true,"transform":{"type":"scalar"},"locs":[{"a":164,"b":170}]},{"name":"kind","required":true,"transform":{"type":"scalar"},"locs":[{"a":173,"b":178}]},{"name":"resource_id","required":false,"transform":{"type":"scalar"},"locs":[{"a":195,"b":206}]},{"name":"variant_id","required":false,"transform":{"type":"scalar"},"locs":[{"a":209,"b":219}]},{"name":"pack_size_kg","required":false,"transform":{"type":"scalar"},"locs":[{"a":230,"b":242}]},{"name":"quantity_kg","required":false,"transform":{"type":"scalar"},"locs":[{"a":245,"b":256}]},{"name":"quantity_packs","required":false,"transform":{"type":"scalar"},"locs":[{"a":259,"b":273}]},{"name":"landed_cost_per_kg","required":true,"transform":{"type":"scalar"},"locs":[{"a":276,"b":295}]}],"statement":"INSERT INTO purchase_order_items\n    (purchase_order_id, kind, resource_id, variant_id,\n     pack_size_kg, quantity_kg, quantity_packs, landed_cost_per_kg)\nVALUES (:po_id!, :kind!::po_line_kind, :resource_id, :variant_id,\n        :pack_size_kg, :quantity_kg, :quantity_packs, :landed_cost_per_kg!)\nRETURNING id"};

/**
 * Query generated from SQL:
 * ```
 * INSERT INTO purchase_order_items
 *     (purchase_order_id, kind, resource_id, variant_id,
 *      pack_size_kg, quantity_kg, quantity_packs, landed_cost_per_kg)
 * VALUES (:po_id!, :kind!::po_line_kind, :resource_id, :variant_id,
 *         :pack_size_kg, :quantity_kg, :quantity_packs, :landed_cost_per_kg!)
 * RETURNING id
 * ```
 */
export const insertPurchaseOrderItem = new PreparedQuery<IInsertPurchaseOrderItemParams,IInsertPurchaseOrderItemResult>(insertPurchaseOrderItemIR);


/** 'PatchPurchaseOrder' parameters type */
export interface IPatchPurchaseOrderParams {
  currency?: string | null | void;
  id: number;
  notes?: string | null | void;
}

/** 'PatchPurchaseOrder' return type */
export interface IPatchPurchaseOrderResult {
  id: number;
}

/** 'PatchPurchaseOrder' query type */
export interface IPatchPurchaseOrderQuery {
  params: IPatchPurchaseOrderParams;
  result: IPatchPurchaseOrderResult;
}

const patchPurchaseOrderIR: any = {"usedParamSet":{"currency":true,"notes":true,"id":true},"params":[{"name":"currency","required":false,"transform":{"type":"scalar"},"locs":[{"a":52,"b":60}]},{"name":"notes","required":false,"transform":{"type":"scalar"},"locs":[{"a":103,"b":108}]},{"name":"id","required":true,"transform":{"type":"scalar"},"locs":[{"a":169,"b":172}]}],"statement":"UPDATE purchase_orders\n   SET currency   = COALESCE(:currency, currency),\n       notes      = COALESCE(:notes, notes),\n       updated_at = CURRENT_TIMESTAMP\n WHERE id = :id!\n RETURNING id"};

/**
 * Query generated from SQL:
 * ```
 * UPDATE purchase_orders
 *    SET currency   = COALESCE(:currency, currency),
 *        notes      = COALESCE(:notes, notes),
 *        updated_at = CURRENT_TIMESTAMP
 *  WHERE id = :id!
 *  RETURNING id
 * ```
 */
export const patchPurchaseOrder = new PreparedQuery<IPatchPurchaseOrderParams,IPatchPurchaseOrderResult>(patchPurchaseOrderIR);


/** 'GetPoItemForEdit' parameters type */
export interface IGetPoItemForEditParams {
  id: number;
}

/** 'GetPoItemForEdit' return type */
export interface IGetPoItemForEditResult {
  id: number;
  po_status: string | null;
}

/** 'GetPoItemForEdit' query type */
export interface IGetPoItemForEditQuery {
  params: IGetPoItemForEditParams;
  result: IGetPoItemForEditResult;
}

const getPoItemForEditIR: any = {"usedParamSet":{"id":true},"params":[{"name":"id","required":true,"transform":{"type":"scalar"},"locs":[{"a":151,"b":154}]}],"statement":"SELECT poi.id, po.status::text AS po_status\n  FROM purchase_order_items poi\n  JOIN purchase_orders po ON po.id = poi.purchase_order_id\n WHERE poi.id = :id!"};

/**
 * Query generated from SQL:
 * ```
 * SELECT poi.id, po.status::text AS po_status
 *   FROM purchase_order_items poi
 *   JOIN purchase_orders po ON po.id = poi.purchase_order_id
 *  WHERE poi.id = :id!
 * ```
 */
export const getPoItemForEdit = new PreparedQuery<IGetPoItemForEditParams,IGetPoItemForEditResult>(getPoItemForEditIR);


/** 'PatchPurchaseOrderItem' parameters type */
export interface IPatchPurchaseOrderItemParams {
  id: number;
  landed_cost_per_kg?: NumberOrString | null | void;
  pack_size_kg?: NumberOrString | null | void;
  quantity_kg?: NumberOrString | null | void;
  quantity_packs?: number | null | void;
}

/** 'PatchPurchaseOrderItem' return type */
export interface IPatchPurchaseOrderItemResult {
  id: number;
}

/** 'PatchPurchaseOrderItem' query type */
export interface IPatchPurchaseOrderItemQuery {
  params: IPatchPurchaseOrderItemParams;
  result: IPatchPurchaseOrderItemResult;
}

const patchPurchaseOrderItemIR: any = {"usedParamSet":{"pack_size_kg":true,"quantity_kg":true,"quantity_packs":true,"landed_cost_per_kg":true,"id":true},"params":[{"name":"pack_size_kg","required":false,"transform":{"type":"scalar"},"locs":[{"a":65,"b":77}]},{"name":"quantity_kg","required":false,"transform":{"type":"scalar"},"locs":[{"a":132,"b":143}]},{"name":"quantity_packs","required":false,"transform":{"type":"scalar"},"locs":[{"a":197,"b":211}]},{"name":"landed_cost_per_kg","required":false,"transform":{"type":"scalar"},"locs":[{"a":268,"b":286}]},{"name":"id","required":true,"transform":{"type":"scalar"},"locs":[{"a":368,"b":371}]}],"statement":"UPDATE purchase_order_items\n   SET pack_size_kg       = COALESCE(:pack_size_kg, pack_size_kg),\n       quantity_kg        = COALESCE(:quantity_kg, quantity_kg),\n       quantity_packs     = COALESCE(:quantity_packs, quantity_packs),\n       landed_cost_per_kg = COALESCE(:landed_cost_per_kg, landed_cost_per_kg),\n       updated_at         = CURRENT_TIMESTAMP\n WHERE id = :id!\n RETURNING id"};

/**
 * Query generated from SQL:
 * ```
 * UPDATE purchase_order_items
 *    SET pack_size_kg       = COALESCE(:pack_size_kg, pack_size_kg),
 *        quantity_kg        = COALESCE(:quantity_kg, quantity_kg),
 *        quantity_packs     = COALESCE(:quantity_packs, quantity_packs),
 *        landed_cost_per_kg = COALESCE(:landed_cost_per_kg, landed_cost_per_kg),
 *        updated_at         = CURRENT_TIMESTAMP
 *  WHERE id = :id!
 *  RETURNING id
 * ```
 */
export const patchPurchaseOrderItem = new PreparedQuery<IPatchPurchaseOrderItemParams,IPatchPurchaseOrderItemResult>(patchPurchaseOrderItemIR);


/** 'DeletePurchaseOrderItem' parameters type */
export interface IDeletePurchaseOrderItemParams {
  id: number;
}

/** 'DeletePurchaseOrderItem' return type */
export type IDeletePurchaseOrderItemResult = void;

/** 'DeletePurchaseOrderItem' query type */
export interface IDeletePurchaseOrderItemQuery {
  params: IDeletePurchaseOrderItemParams;
  result: IDeletePurchaseOrderItemResult;
}

const deletePurchaseOrderItemIR: any = {"usedParamSet":{"id":true},"params":[{"name":"id","required":true,"transform":{"type":"scalar"},"locs":[{"a":44,"b":47}]}],"statement":"DELETE FROM purchase_order_items WHERE id = :id!"};

/**
 * Query generated from SQL:
 * ```
 * DELETE FROM purchase_order_items WHERE id = :id!
 * ```
 */
export const deletePurchaseOrderItem = new PreparedQuery<IDeletePurchaseOrderItemParams,IDeletePurchaseOrderItemResult>(deletePurchaseOrderItemIR);


/** 'GetPurchaseOrderStatus' parameters type */
export interface IGetPurchaseOrderStatusParams {
  id: number;
}

/** 'GetPurchaseOrderStatus' return type */
export interface IGetPurchaseOrderStatusResult {
  status: string | null;
}

/** 'GetPurchaseOrderStatus' query type */
export interface IGetPurchaseOrderStatusQuery {
  params: IGetPurchaseOrderStatusParams;
  result: IGetPurchaseOrderStatusResult;
}

const getPurchaseOrderStatusIR: any = {"usedParamSet":{"id":true},"params":[{"name":"id","required":true,"transform":{"type":"scalar"},"locs":[{"a":62,"b":65}]}],"statement":"SELECT status::text AS status FROM purchase_orders WHERE id = :id!"};

/**
 * Query generated from SQL:
 * ```
 * SELECT status::text AS status FROM purchase_orders WHERE id = :id!
 * ```
 */
export const getPurchaseOrderStatus = new PreparedQuery<IGetPurchaseOrderStatusParams,IGetPurchaseOrderStatusResult>(getPurchaseOrderStatusIR);


/** 'SetPurchaseOrderStatus' parameters type */
export interface ISetPurchaseOrderStatusParams {
  id: number;
  stamp_ordered?: boolean | null | void;
  stamp_received?: boolean | null | void;
  stamp_shipped?: boolean | null | void;
  status: po_status;
}

/** 'SetPurchaseOrderStatus' return type */
export type ISetPurchaseOrderStatusResult = void;

/** 'SetPurchaseOrderStatus' query type */
export interface ISetPurchaseOrderStatusQuery {
  params: ISetPurchaseOrderStatusParams;
  result: ISetPurchaseOrderStatusResult;
}

const setPurchaseOrderStatusIR: any = {"usedParamSet":{"status":true,"stamp_ordered":true,"stamp_shipped":true,"stamp_received":true,"id":true},"params":[{"name":"status","required":true,"transform":{"type":"scalar"},"locs":[{"a":44,"b":51}]},{"name":"stamp_ordered","required":false,"transform":{"type":"scalar"},"locs":[{"a":96,"b":109}]},{"name":"stamp_shipped","required":false,"transform":{"type":"scalar"},"locs":[{"a":192,"b":205}]},{"name":"stamp_received","required":false,"transform":{"type":"scalar"},"locs":[{"a":288,"b":302}]},{"name":"id","required":true,"transform":{"type":"scalar"},"locs":[{"a":406,"b":409}]}],"statement":"UPDATE purchase_orders\n   SET status      = :status!::po_status,\n       ordered_at  = CASE WHEN :stamp_ordered::bool THEN CURRENT_TIMESTAMP ELSE ordered_at END,\n       shipped_at  = CASE WHEN :stamp_shipped::bool THEN CURRENT_TIMESTAMP ELSE shipped_at END,\n       received_at = CASE WHEN :stamp_received::bool THEN CURRENT_TIMESTAMP ELSE received_at END,\n       updated_at  = CURRENT_TIMESTAMP\n WHERE id = :id!"};

/**
 * Query generated from SQL:
 * ```
 * UPDATE purchase_orders
 *    SET status      = :status!::po_status,
 *        ordered_at  = CASE WHEN :stamp_ordered::bool THEN CURRENT_TIMESTAMP ELSE ordered_at END,
 *        shipped_at  = CASE WHEN :stamp_shipped::bool THEN CURRENT_TIMESTAMP ELSE shipped_at END,
 *        received_at = CASE WHEN :stamp_received::bool THEN CURRENT_TIMESTAMP ELSE received_at END,
 *        updated_at  = CURRENT_TIMESTAMP
 *  WHERE id = :id!
 * ```
 */
export const setPurchaseOrderStatus = new PreparedQuery<ISetPurchaseOrderStatusParams,ISetPurchaseOrderStatusResult>(setPurchaseOrderStatusIR);


/** 'LockPurchaseOrderForReceive' parameters type */
export interface ILockPurchaseOrderForReceiveParams {
  id: number;
}

/** 'LockPurchaseOrderForReceive' return type */
export interface ILockPurchaseOrderForReceiveResult {
  currency: string;
  status: string | null;
}

/** 'LockPurchaseOrderForReceive' query type */
export interface ILockPurchaseOrderForReceiveQuery {
  params: ILockPurchaseOrderForReceiveParams;
  result: ILockPurchaseOrderForReceiveResult;
}

const lockPurchaseOrderForReceiveIR: any = {"usedParamSet":{"id":true},"params":[{"name":"id","required":true,"transform":{"type":"scalar"},"locs":[{"a":72,"b":75}]}],"statement":"SELECT status::text AS status, currency FROM purchase_orders WHERE id = :id! FOR UPDATE"};

/**
 * Query generated from SQL:
 * ```
 * SELECT status::text AS status, currency FROM purchase_orders WHERE id = :id! FOR UPDATE
 * ```
 */
export const lockPurchaseOrderForReceive = new PreparedQuery<ILockPurchaseOrderForReceiveParams,ILockPurchaseOrderForReceiveResult>(lockPurchaseOrderForReceiveIR);


/** 'LockPoItemForReceive' parameters type */
export interface ILockPoItemForReceiveParams {
  id: number;
  po_id: number;
}

/** 'LockPoItemForReceive' return type */
export interface ILockPoItemForReceiveResult {
  kind: string | null;
  landed_cost_per_kg: string;
  pack_size_kg: string | null;
  quantity_kg: string | null;
  quantity_packs: number | null;
  received_packs: number;
  received_quantity_kg: string;
  resource_id: number | null;
  variant_id: number | null;
}

/** 'LockPoItemForReceive' query type */
export interface ILockPoItemForReceiveQuery {
  params: ILockPoItemForReceiveParams;
  result: ILockPoItemForReceiveResult;
}

const lockPoItemForReceiveIR: any = {"usedParamSet":{"id":true,"po_id":true},"params":[{"name":"id","required":true,"transform":{"type":"scalar"},"locs":[{"a":206,"b":209}]},{"name":"po_id","required":true,"transform":{"type":"scalar"},"locs":[{"a":235,"b":241}]}],"statement":"SELECT kind::text AS kind, resource_id, variant_id, pack_size_kg,\n       quantity_kg, quantity_packs, landed_cost_per_kg,\n       received_quantity_kg, received_packs\n  FROM purchase_order_items\n WHERE id = :id! AND purchase_order_id = :po_id!\n FOR UPDATE"};

/**
 * Query generated from SQL:
 * ```
 * SELECT kind::text AS kind, resource_id, variant_id, pack_size_kg,
 *        quantity_kg, quantity_packs, landed_cost_per_kg,
 *        received_quantity_kg, received_packs
 *   FROM purchase_order_items
 *  WHERE id = :id! AND purchase_order_id = :po_id!
 *  FOR UPDATE
 * ```
 */
export const lockPoItemForReceive = new PreparedQuery<ILockPoItemForReceiveParams,ILockPoItemForReceiveResult>(lockPoItemForReceiveIR);


/** 'InsertResourceReceipt' parameters type */
export interface IInsertResourceReceiptParams {
  po_item_id: NumberOrString;
  quantity_kg: NumberOrString;
  resource_id: number;
  unit_cost_per_kg: NumberOrString;
  user_id: number;
}

/** 'InsertResourceReceipt' return type */
export type IInsertResourceReceiptResult = void;

/** 'InsertResourceReceipt' query type */
export interface IInsertResourceReceiptQuery {
  params: IInsertResourceReceiptParams;
  result: IInsertResourceReceiptResult;
}

const insertResourceReceiptIR: any = {"usedParamSet":{"resource_id":true,"quantity_kg":true,"unit_cost_per_kg":true,"po_item_id":true,"user_id":true},"params":[{"name":"resource_id","required":true,"transform":{"type":"scalar"},"locs":[{"a":161,"b":173}]},{"name":"quantity_kg","required":true,"transform":{"type":"scalar"},"locs":[{"a":190,"b":202}]},{"name":"unit_cost_per_kg","required":true,"transform":{"type":"scalar"},"locs":[{"a":205,"b":222}]},{"name":"po_item_id","required":true,"transform":{"type":"scalar"},"locs":[{"a":256,"b":267}]},{"name":"user_id","required":true,"transform":{"type":"scalar"},"locs":[{"a":276,"b":284}]}],"statement":"INSERT INTO resource_stock_transactions\n    (resource_id, txn_type, quantity_kg, unit_cost_per_kg,\n     reference_type, reference_id, notes, created_by)\nVALUES (:resource_id!, 'po_receipt', :quantity_kg!, :unit_cost_per_kg!,\n        'purchase_order_item', :po_item_id!, NULL, :user_id!)"};

/**
 * Query generated from SQL:
 * ```
 * INSERT INTO resource_stock_transactions
 *     (resource_id, txn_type, quantity_kg, unit_cost_per_kg,
 *      reference_type, reference_id, notes, created_by)
 * VALUES (:resource_id!, 'po_receipt', :quantity_kg!, :unit_cost_per_kg!,
 *         'purchase_order_item', :po_item_id!, NULL, :user_id!)
 * ```
 */
export const insertResourceReceipt = new PreparedQuery<IInsertResourceReceiptParams,IInsertResourceReceiptResult>(insertResourceReceiptIR);


/** 'BumpReceivedQuantityKg' parameters type */
export interface IBumpReceivedQuantityKgParams {
  delta: NumberOrString;
  id: number;
}

/** 'BumpReceivedQuantityKg' return type */
export type IBumpReceivedQuantityKgResult = void;

/** 'BumpReceivedQuantityKg' query type */
export interface IBumpReceivedQuantityKgQuery {
  params: IBumpReceivedQuantityKgParams;
  result: IBumpReceivedQuantityKgResult;
}

const bumpReceivedQuantityKgIR: any = {"usedParamSet":{"delta":true,"id":true},"params":[{"name":"delta","required":true,"transform":{"type":"scalar"},"locs":[{"a":81,"b":87}]},{"name":"id","required":true,"transform":{"type":"scalar"},"locs":[{"a":140,"b":143}]}],"statement":"UPDATE purchase_order_items\n   SET received_quantity_kg = received_quantity_kg + :delta!,\n       updated_at = CURRENT_TIMESTAMP\n WHERE id = :id!"};

/**
 * Query generated from SQL:
 * ```
 * UPDATE purchase_order_items
 *    SET received_quantity_kg = received_quantity_kg + :delta!,
 *        updated_at = CURRENT_TIMESTAMP
 *  WHERE id = :id!
 * ```
 */
export const bumpReceivedQuantityKg = new PreparedQuery<IBumpReceivedQuantityKgParams,IBumpReceivedQuantityKgResult>(bumpReceivedQuantityKgIR);


/** 'InsertSupplierFinishedPack' parameters type */
export interface IInsertSupplierFinishedPackParams {
  cost_per_kg: NumberOrString;
  pack_size_kg: NumberOrString;
  po_item_id: number;
  variant_id: number;
}

/** 'InsertSupplierFinishedPack' return type */
export type IInsertSupplierFinishedPackResult = void;

/** 'InsertSupplierFinishedPack' query type */
export interface IInsertSupplierFinishedPackQuery {
  params: IInsertSupplierFinishedPackParams;
  result: IInsertSupplierFinishedPackResult;
}

const insertSupplierFinishedPackIR: any = {"usedParamSet":{"variant_id":true,"pack_size_kg":true,"po_item_id":true,"cost_per_kg":true},"params":[{"name":"variant_id","required":true,"transform":{"type":"scalar"},"locs":[{"a":113,"b":124}]},{"name":"pack_size_kg","required":true,"transform":{"type":"scalar"},"locs":[{"a":127,"b":140}]},{"name":"po_item_id","required":true,"transform":{"type":"scalar"},"locs":[{"a":155,"b":166}]},{"name":"cost_per_kg","required":true,"transform":{"type":"scalar"},"locs":[{"a":169,"b":181}]}],"statement":"INSERT INTO finished_paint_packs\n    (variant_id, pack_size_kg, source, po_item_id, cost_per_kg, status)\nVALUES (:variant_id!, :pack_size_kg!, 'supplier', :po_item_id!, :cost_per_kg!, 'in_stock')"};

/**
 * Query generated from SQL:
 * ```
 * INSERT INTO finished_paint_packs
 *     (variant_id, pack_size_kg, source, po_item_id, cost_per_kg, status)
 * VALUES (:variant_id!, :pack_size_kg!, 'supplier', :po_item_id!, :cost_per_kg!, 'in_stock')
 * ```
 */
export const insertSupplierFinishedPack = new PreparedQuery<IInsertSupplierFinishedPackParams,IInsertSupplierFinishedPackResult>(insertSupplierFinishedPackIR);


/** 'BumpReceivedPacks' parameters type */
export interface IBumpReceivedPacksParams {
  delta: number;
  id: number;
}

/** 'BumpReceivedPacks' return type */
export type IBumpReceivedPacksResult = void;

/** 'BumpReceivedPacks' query type */
export interface IBumpReceivedPacksQuery {
  params: IBumpReceivedPacksParams;
  result: IBumpReceivedPacksResult;
}

const bumpReceivedPacksIR: any = {"usedParamSet":{"delta":true,"id":true},"params":[{"name":"delta","required":true,"transform":{"type":"scalar"},"locs":[{"a":69,"b":75}]},{"name":"id","required":true,"transform":{"type":"scalar"},"locs":[{"a":128,"b":131}]}],"statement":"UPDATE purchase_order_items\n   SET received_packs = received_packs + :delta!,\n       updated_at = CURRENT_TIMESTAMP\n WHERE id = :id!"};

/**
 * Query generated from SQL:
 * ```
 * UPDATE purchase_order_items
 *    SET received_packs = received_packs + :delta!,
 *        updated_at = CURRENT_TIMESTAMP
 *  WHERE id = :id!
 * ```
 */
export const bumpReceivedPacks = new PreparedQuery<IBumpReceivedPacksParams,IBumpReceivedPacksResult>(bumpReceivedPacksIR);


/** 'CountPendingPoItems' parameters type */
export interface ICountPendingPoItemsParams {
  po_id: number;
}

/** 'CountPendingPoItems' return type */
export interface ICountPendingPoItemsResult {
  pending: string | null;
}

/** 'CountPendingPoItems' query type */
export interface ICountPendingPoItemsQuery {
  params: ICountPendingPoItemsParams;
  result: ICountPendingPoItemsResult;
}

const countPendingPoItemsIR: any = {"usedParamSet":{"po_id":true},"params":[{"name":"po_id","required":true,"transform":{"type":"scalar"},"locs":[{"a":82,"b":88}]}],"statement":"SELECT COUNT(*) AS pending\n  FROM purchase_order_items\n WHERE purchase_order_id = :po_id!\n   AND ((kind = 'resource'       AND received_quantity_kg < quantity_kg)\n     OR (kind = 'finished_paint' AND received_packs       < quantity_packs))"};

/**
 * Query generated from SQL:
 * ```
 * SELECT COUNT(*) AS pending
 *   FROM purchase_order_items
 *  WHERE purchase_order_id = :po_id!
 *    AND ((kind = 'resource'       AND received_quantity_kg < quantity_kg)
 *      OR (kind = 'finished_paint' AND received_packs       < quantity_packs))
 * ```
 */
export const countPendingPoItems = new PreparedQuery<ICountPendingPoItemsParams,ICountPendingPoItemsResult>(countPendingPoItemsIR);


/** 'MarkPurchaseOrderReceived' parameters type */
export interface IMarkPurchaseOrderReceivedParams {
  id: number;
}

/** 'MarkPurchaseOrderReceived' return type */
export type IMarkPurchaseOrderReceivedResult = void;

/** 'MarkPurchaseOrderReceived' query type */
export interface IMarkPurchaseOrderReceivedQuery {
  params: IMarkPurchaseOrderReceivedParams;
  result: IMarkPurchaseOrderReceivedResult;
}

const markPurchaseOrderReceivedIR: any = {"usedParamSet":{"id":true},"params":[{"name":"id","required":true,"transform":{"type":"scalar"},"locs":[{"a":127,"b":130}]}],"statement":"UPDATE purchase_orders\n   SET status = 'received', received_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP\n WHERE id = :id!"};

/**
 * Query generated from SQL:
 * ```
 * UPDATE purchase_orders
 *    SET status = 'received', received_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
 *  WHERE id = :id!
 * ```
 */
export const markPurchaseOrderReceived = new PreparedQuery<IMarkPurchaseOrderReceivedParams,IMarkPurchaseOrderReceivedResult>(markPurchaseOrderReceivedIR);


/** 'ArchivePurchaseOrder' parameters type */
export interface IArchivePurchaseOrderParams {
  id: number;
  user_id: number;
}

/** 'ArchivePurchaseOrder' return type */
export interface IArchivePurchaseOrderResult {
  id: number;
}

/** 'ArchivePurchaseOrder' query type */
export interface IArchivePurchaseOrderQuery {
  params: IArchivePurchaseOrderParams;
  result: IArchivePurchaseOrderResult;
}

const archivePurchaseOrderIR: any = {"usedParamSet":{"user_id":true,"id":true},"params":[{"name":"user_id","required":true,"transform":{"type":"scalar"},"locs":[{"a":74,"b":82}]},{"name":"id","required":true,"transform":{"type":"scalar"},"locs":[{"a":96,"b":99}]}],"statement":"UPDATE purchase_orders SET archived_at = CURRENT_TIMESTAMP, archived_by = :user_id!\n WHERE id = :id! AND archived_at IS NULL RETURNING id"};

/**
 * Query generated from SQL:
 * ```
 * UPDATE purchase_orders SET archived_at = CURRENT_TIMESTAMP, archived_by = :user_id!
 *  WHERE id = :id! AND archived_at IS NULL RETURNING id
 * ```
 */
export const archivePurchaseOrder = new PreparedQuery<IArchivePurchaseOrderParams,IArchivePurchaseOrderResult>(archivePurchaseOrderIR);


/** 'RestorePurchaseOrder' parameters type */
export interface IRestorePurchaseOrderParams {
  id: number;
}

/** 'RestorePurchaseOrder' return type */
export interface IRestorePurchaseOrderResult {
  id: number;
}

/** 'RestorePurchaseOrder' query type */
export interface IRestorePurchaseOrderQuery {
  params: IRestorePurchaseOrderParams;
  result: IRestorePurchaseOrderResult;
}

const restorePurchaseOrderIR: any = {"usedParamSet":{"id":true},"params":[{"name":"id","required":true,"transform":{"type":"scalar"},"locs":[{"a":77,"b":80}]}],"statement":"UPDATE purchase_orders SET archived_at = NULL, archived_by = NULL WHERE id = :id! RETURNING id"};

/**
 * Query generated from SQL:
 * ```
 * UPDATE purchase_orders SET archived_at = NULL, archived_by = NULL WHERE id = :id! RETURNING id
 * ```
 */
export const restorePurchaseOrder = new PreparedQuery<IRestorePurchaseOrderParams,IRestorePurchaseOrderResult>(restorePurchaseOrderIR);


/** 'ListProductionRequests' parameters type */
export interface IListProductionRequestsParams {
  status: production_request_status;
}

/** 'ListProductionRequests' return type */
export interface IListProductionRequestsResult {
  classification: paint_classification;
  created_at: Date;
  id: number;
  ink_series: ink_series;
  notes: string | null;
  order_item_id: number | null;
  origin: string | null;
  pack_size_kg: string;
  paint_name: string;
  quantity_packs: number;
  status: string | null;
  variant_id: number;
}

/** 'ListProductionRequests' query type */
export interface IListProductionRequestsQuery {
  params: IListProductionRequestsParams;
  result: IListProductionRequestsResult;
}

const listProductionRequestsIR: any = {"usedParamSet":{"status":true},"params":[{"name":"status","required":true,"transform":{"type":"scalar"},"locs":[{"a":370,"b":377}]}],"statement":"SELECT pr.id, pr.variant_id, pr.pack_size_kg, pr.quantity_packs,\n       pr.origin::text AS origin, pr.order_item_id,\n       pr.status::text AS status, pr.notes, pr.created_at,\n       p.name AS paint_name, v.classification, v.ink_series\n  FROM production_requests pr\n  JOIN paint_variants v ON v.id = pr.variant_id\n  JOIN paints p ON p.id = v.paint_id\n WHERE pr.status = :status!::production_request_status\n ORDER BY pr.created_at ASC\n LIMIT 200"};

/**
 * Query generated from SQL:
 * ```
 * SELECT pr.id, pr.variant_id, pr.pack_size_kg, pr.quantity_packs,
 *        pr.origin::text AS origin, pr.order_item_id,
 *        pr.status::text AS status, pr.notes, pr.created_at,
 *        p.name AS paint_name, v.classification, v.ink_series
 *   FROM production_requests pr
 *   JOIN paint_variants v ON v.id = pr.variant_id
 *   JOIN paints p ON p.id = v.paint_id
 *  WHERE pr.status = :status!::production_request_status
 *  ORDER BY pr.created_at ASC
 *  LIMIT 200
 * ```
 */
export const listProductionRequests = new PreparedQuery<IListProductionRequestsParams,IListProductionRequestsResult>(listProductionRequestsIR);


/** 'GetProductionRequest' parameters type */
export interface IGetProductionRequestParams {
  id: number;
}

/** 'GetProductionRequest' return type */
export interface IGetProductionRequestResult {
  classification: paint_classification;
  created_at: Date;
  id: number;
  ink_series: ink_series;
  notes: string | null;
  order_item_id: number | null;
  origin: string | null;
  pack_size_kg: string;
  paint_name: string;
  quantity_packs: number;
  status: string | null;
  updated_at: Date;
  variant_id: number;
}

/** 'GetProductionRequest' query type */
export interface IGetProductionRequestQuery {
  params: IGetProductionRequestParams;
  result: IGetProductionRequestResult;
}

const getProductionRequestIR: any = {"usedParamSet":{"id":true},"params":[{"name":"id","required":true,"transform":{"type":"scalar"},"locs":[{"a":381,"b":384}]}],"statement":"SELECT pr.id, pr.variant_id, pr.pack_size_kg, pr.quantity_packs,\n       pr.origin::text AS origin, pr.order_item_id,\n       pr.status::text AS status, pr.notes, pr.created_at, pr.updated_at,\n       p.name AS paint_name, v.classification, v.ink_series\n  FROM production_requests pr\n  JOIN paint_variants v ON v.id = pr.variant_id\n  JOIN paints p ON p.id = v.paint_id\n WHERE pr.id = :id!"};

/**
 * Query generated from SQL:
 * ```
 * SELECT pr.id, pr.variant_id, pr.pack_size_kg, pr.quantity_packs,
 *        pr.origin::text AS origin, pr.order_item_id,
 *        pr.status::text AS status, pr.notes, pr.created_at, pr.updated_at,
 *        p.name AS paint_name, v.classification, v.ink_series
 *   FROM production_requests pr
 *   JOIN paint_variants v ON v.id = pr.variant_id
 *   JOIN paints p ON p.id = v.paint_id
 *  WHERE pr.id = :id!
 * ```
 */
export const getProductionRequest = new PreparedQuery<IGetProductionRequestParams,IGetProductionRequestResult>(getProductionRequestIR);


/** 'InsertProductionRequest' parameters type */
export interface IInsertProductionRequestParams {
  notes?: string | null | void;
  pack_size_kg: NumberOrString;
  quantity_packs: number;
  user_id: number;
  variant_id: number;
}

/** 'InsertProductionRequest' return type */
export interface IInsertProductionRequestResult {
  id: number;
}

/** 'InsertProductionRequest' query type */
export interface IInsertProductionRequestQuery {
  params: IInsertProductionRequestParams;
  result: IInsertProductionRequestResult;
}

const insertProductionRequestIR: any = {"usedParamSet":{"variant_id":true,"pack_size_kg":true,"quantity_packs":true,"notes":true,"user_id":true},"params":[{"name":"variant_id","required":true,"transform":{"type":"scalar"},"locs":[{"a":122,"b":133}]},{"name":"pack_size_kg","required":true,"transform":{"type":"scalar"},"locs":[{"a":136,"b":149}]},{"name":"quantity_packs","required":true,"transform":{"type":"scalar"},"locs":[{"a":152,"b":167}]},{"name":"notes","required":false,"transform":{"type":"scalar"},"locs":[{"a":202,"b":207}]},{"name":"user_id","required":true,"transform":{"type":"scalar"},"locs":[{"a":210,"b":218}]}],"statement":"INSERT INTO production_requests\n    (variant_id, pack_size_kg, quantity_packs, origin, status, notes, created_by)\nVALUES (:variant_id!, :pack_size_kg!, :quantity_packs!, 'demand_suggestion', 'pending', :notes, :user_id!)\nRETURNING id"};

/**
 * Query generated from SQL:
 * ```
 * INSERT INTO production_requests
 *     (variant_id, pack_size_kg, quantity_packs, origin, status, notes, created_by)
 * VALUES (:variant_id!, :pack_size_kg!, :quantity_packs!, 'demand_suggestion', 'pending', :notes, :user_id!)
 * RETURNING id
 * ```
 */
export const insertProductionRequest = new PreparedQuery<IInsertProductionRequestParams,IInsertProductionRequestResult>(insertProductionRequestIR);


/** 'CancelProductionRequest' parameters type */
export interface ICancelProductionRequestParams {
  id: number;
}

/** 'CancelProductionRequest' return type */
export interface ICancelProductionRequestResult {
  id: number;
}

/** 'CancelProductionRequest' query type */
export interface ICancelProductionRequestQuery {
  params: ICancelProductionRequestParams;
  result: ICancelProductionRequestResult;
}

const cancelProductionRequestIR: any = {"usedParamSet":{"id":true},"params":[{"name":"id","required":true,"transform":{"type":"scalar"},"locs":[{"a":99,"b":102}]}],"statement":"UPDATE production_requests\n   SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP\n WHERE id = :id! AND status IN ('pending', 'in_production')\n RETURNING id"};

/**
 * Query generated from SQL:
 * ```
 * UPDATE production_requests
 *    SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP
 *  WHERE id = :id! AND status IN ('pending', 'in_production')
 *  RETURNING id
 * ```
 */
export const cancelProductionRequest = new PreparedQuery<ICancelProductionRequestParams,ICancelProductionRequestResult>(cancelProductionRequestIR);


/** 'MarkRequestInProduction' parameters type */
export interface IMarkRequestInProductionParams {
  id: number;
}

/** 'MarkRequestInProduction' return type */
export type IMarkRequestInProductionResult = void;

/** 'MarkRequestInProduction' query type */
export interface IMarkRequestInProductionQuery {
  params: IMarkRequestInProductionParams;
  result: IMarkRequestInProductionResult;
}

const markRequestInProductionIR: any = {"usedParamSet":{"id":true},"params":[{"name":"id","required":true,"transform":{"type":"scalar"},"locs":[{"a":99,"b":102}]}],"statement":"UPDATE production_requests SET status = 'in_production', updated_at = CURRENT_TIMESTAMP WHERE id = :id!"};

/**
 * Query generated from SQL:
 * ```
 * UPDATE production_requests SET status = 'in_production', updated_at = CURRENT_TIMESTAMP WHERE id = :id!
 * ```
 */
export const markRequestInProduction = new PreparedQuery<IMarkRequestInProductionParams,IMarkRequestInProductionResult>(markRequestInProductionIR);


/** 'MarkRequestCompleted' parameters type */
export interface IMarkRequestCompletedParams {
  id: number;
}

/** 'MarkRequestCompleted' return type */
export type IMarkRequestCompletedResult = void;

/** 'MarkRequestCompleted' query type */
export interface IMarkRequestCompletedQuery {
  params: IMarkRequestCompletedParams;
  result: IMarkRequestCompletedResult;
}

const markRequestCompletedIR: any = {"usedParamSet":{"id":true},"params":[{"name":"id","required":true,"transform":{"type":"scalar"},"locs":[{"a":95,"b":98}]}],"statement":"UPDATE production_requests SET status = 'completed', updated_at = CURRENT_TIMESTAMP WHERE id = :id!"};

/**
 * Query generated from SQL:
 * ```
 * UPDATE production_requests SET status = 'completed', updated_at = CURRENT_TIMESTAMP WHERE id = :id!
 * ```
 */
export const markRequestCompleted = new PreparedQuery<IMarkRequestCompletedParams,IMarkRequestCompletedResult>(markRequestCompletedIR);


/** 'ListProductionRuns' parameters type */
export interface IListProductionRunsParams {
  operator_id?: number | null | void;
  page_offset: NumberOrString;
  page_size: NumberOrString;
  status?: production_run_status | null | void;
  variant_id?: number | null | void;
}

/** 'ListProductionRuns' return type */
export interface IListProductionRunsResult {
  _total: string | null;
  actual_output_kg: string | null;
  batch_number: string;
  classification: paint_classification;
  completed_at: Date | null;
  created_at: Date;
  dilution_flagged: boolean;
  dilution_total_kg: string;
  expected_output_kg: string;
  formula_id: number;
  id: number;
  ink_series: ink_series;
  operator: string;
  paint_name: string;
  started_at: Date | null;
  status: string | null;
  variant_id: number;
  wastage_flagged: boolean;
  wastage_pct: string | null;
}

/** 'ListProductionRuns' query type */
export interface IListProductionRunsQuery {
  params: IListProductionRunsParams;
  result: IListProductionRunsResult;
}

const listProductionRunsIR: any = {"usedParamSet":{"status":true,"variant_id":true,"operator_id":true,"page_size":true,"page_offset":true},"params":[{"name":"status","required":false,"transform":{"type":"scalar"},"locs":[{"a":582,"b":588},{"a":635,"b":641}]},{"name":"variant_id","required":false,"transform":{"type":"scalar"},"locs":[{"a":652,"b":662},{"a":696,"b":706}]},{"name":"operator_id","required":false,"transform":{"type":"scalar"},"locs":[{"a":717,"b":728},{"a":761,"b":772}]},{"name":"page_size","required":true,"transform":{"type":"scalar"},"locs":[{"a":810,"b":820}]},{"name":"page_offset","required":true,"transform":{"type":"scalar"},"locs":[{"a":829,"b":841}]}],"statement":"SELECT r.id, r.batch_number, r.variant_id, r.formula_id,\n       r.status::text AS status,\n       r.expected_output_kg, r.actual_output_kg, r.wastage_pct, r.wastage_flagged,\n       r.dilution_total_kg, r.dilution_flagged,\n       r.started_at, r.completed_at, r.created_at,\n       u.username AS operator, p.name AS paint_name,\n       v.classification, v.ink_series,\n       COUNT(*) OVER () AS _total\n  FROM production_runs r\n  JOIN users u ON u.id = r.created_by\n  JOIN paint_variants v ON v.id = r.variant_id\n  JOIN paints p ON p.id = v.paint_id\n WHERE r.archived_at IS NULL\n   AND (:status::production_run_status IS NULL OR r.status = :status)\n   AND (:variant_id::int  IS NULL OR r.variant_id = :variant_id)\n   AND (:operator_id::int IS NULL OR r.created_by = :operator_id)\n ORDER BY r.created_at DESC\n LIMIT :page_size! OFFSET :page_offset!"};

/**
 * Query generated from SQL:
 * ```
 * SELECT r.id, r.batch_number, r.variant_id, r.formula_id,
 *        r.status::text AS status,
 *        r.expected_output_kg, r.actual_output_kg, r.wastage_pct, r.wastage_flagged,
 *        r.dilution_total_kg, r.dilution_flagged,
 *        r.started_at, r.completed_at, r.created_at,
 *        u.username AS operator, p.name AS paint_name,
 *        v.classification, v.ink_series,
 *        COUNT(*) OVER () AS _total
 *   FROM production_runs r
 *   JOIN users u ON u.id = r.created_by
 *   JOIN paint_variants v ON v.id = r.variant_id
 *   JOIN paints p ON p.id = v.paint_id
 *  WHERE r.archived_at IS NULL
 *    AND (:status::production_run_status IS NULL OR r.status = :status)
 *    AND (:variant_id::int  IS NULL OR r.variant_id = :variant_id)
 *    AND (:operator_id::int IS NULL OR r.created_by = :operator_id)
 *  ORDER BY r.created_at DESC
 *  LIMIT :page_size! OFFSET :page_offset!
 * ```
 */
export const listProductionRuns = new PreparedQuery<IListProductionRunsParams,IListProductionRunsResult>(listProductionRunsIR);


/** 'GetProductionRun' parameters type */
export interface IGetProductionRunParams {
  id: number;
}

/** 'GetProductionRun' return type */
export interface IGetProductionRunResult {
  actual_output_kg: string | null;
  actuals: unknown | null;
  archived_at: Date | null;
  archived_by: number | null;
  batch_number: string;
  classification: paint_classification;
  completed_at: Date | null;
  created_at: Date;
  created_by: number;
  dilution: unknown | null;
  dilution_flagged: boolean;
  dilution_total_kg: string;
  expected_output_kg: string;
  formula_id: number;
  formula_name: string;
  id: number;
  ink_series: ink_series;
  notes: string | null;
  operator: string;
  packs: unknown | null;
  paint_name: string;
  request_id: number | null;
  standard_output_kg: string;
  started_at: Date | null;
  status: string | null;
  updated_at: Date;
  variant_id: number;
  wastage_flagged: boolean;
  wastage_pct: string | null;
}

/** 'GetProductionRun' query type */
export interface IGetProductionRunQuery {
  params: IGetProductionRunParams;
  result: IGetProductionRunResult;
}

const getProductionRunIR: any = {"usedParamSet":{"id":true},"params":[{"name":"id","required":true,"transform":{"type":"scalar"},"locs":[{"a":2122,"b":2125}]}],"statement":"SELECT r.id, r.batch_number, r.request_id, r.variant_id, r.formula_id,\n       r.status::text AS status,\n       r.expected_output_kg, r.actual_output_kg, r.wastage_pct, r.wastage_flagged,\n       r.dilution_total_kg, r.dilution_flagged,\n       r.started_at, r.completed_at, r.notes,\n       r.archived_at, r.archived_by, r.created_by, r.created_at, r.updated_at,\n       u.username AS operator,\n       p.name AS paint_name, v.classification, v.ink_series,\n       f.name AS formula_name, f.standard_output_kg,\n       COALESCE((\n           SELECT jsonb_agg(jsonb_build_object(\n               'resource_id',   a.resource_id,\n               'resource_name', res.name,\n               'expected_kg',   a.expected_kg,\n               'actual_kg',     a.actual_kg,\n               'variance_pct',  a.variance_pct,\n               'flagged',       a.flagged\n           ) ORDER BY res.name)\n           FROM production_resource_actuals a\n           JOIN resources res ON res.id = a.resource_id\n           WHERE a.production_run_id = r.id\n       ), '[]'::jsonb) AS actuals,\n       COALESCE((\n           SELECT jsonb_agg(jsonb_build_object(\n               'id',            d.id,\n               'resource_id',   d.resource_id,\n               'resource_name', res.name,\n               'kg_added',      d.kg_added,\n               'notes',         d.notes,\n               'created_at',    d.created_at\n           ) ORDER BY d.id)\n           FROM production_dilution_adjustments d\n           JOIN resources res ON res.id = d.resource_id\n           WHERE d.production_run_id = r.id\n       ), '[]'::jsonb) AS dilution,\n       COALESCE((\n           SELECT jsonb_agg(jsonb_build_object(\n               'id', fp.id, 'pack_size_kg', fp.pack_size_kg,\n               'status', fp.status, 'cost_per_kg', fp.cost_per_kg\n           ) ORDER BY fp.id)\n           FROM finished_paint_packs fp WHERE fp.production_run_id = r.id\n       ), '[]'::jsonb) AS packs\n  FROM production_runs r\n  JOIN users u ON u.id = r.created_by\n  JOIN paint_variants v ON v.id = r.variant_id\n  JOIN paints p ON p.id = v.paint_id\n  JOIN formulas f ON f.id = r.formula_id\n WHERE r.id = :id!"};

/**
 * Query generated from SQL:
 * ```
 * SELECT r.id, r.batch_number, r.request_id, r.variant_id, r.formula_id,
 *        r.status::text AS status,
 *        r.expected_output_kg, r.actual_output_kg, r.wastage_pct, r.wastage_flagged,
 *        r.dilution_total_kg, r.dilution_flagged,
 *        r.started_at, r.completed_at, r.notes,
 *        r.archived_at, r.archived_by, r.created_by, r.created_at, r.updated_at,
 *        u.username AS operator,
 *        p.name AS paint_name, v.classification, v.ink_series,
 *        f.name AS formula_name, f.standard_output_kg,
 *        COALESCE((
 *            SELECT jsonb_agg(jsonb_build_object(
 *                'resource_id',   a.resource_id,
 *                'resource_name', res.name,
 *                'expected_kg',   a.expected_kg,
 *                'actual_kg',     a.actual_kg,
 *                'variance_pct',  a.variance_pct,
 *                'flagged',       a.flagged
 *            ) ORDER BY res.name)
 *            FROM production_resource_actuals a
 *            JOIN resources res ON res.id = a.resource_id
 *            WHERE a.production_run_id = r.id
 *        ), '[]'::jsonb) AS actuals,
 *        COALESCE((
 *            SELECT jsonb_agg(jsonb_build_object(
 *                'id',            d.id,
 *                'resource_id',   d.resource_id,
 *                'resource_name', res.name,
 *                'kg_added',      d.kg_added,
 *                'notes',         d.notes,
 *                'created_at',    d.created_at
 *            ) ORDER BY d.id)
 *            FROM production_dilution_adjustments d
 *            JOIN resources res ON res.id = d.resource_id
 *            WHERE d.production_run_id = r.id
 *        ), '[]'::jsonb) AS dilution,
 *        COALESCE((
 *            SELECT jsonb_agg(jsonb_build_object(
 *                'id', fp.id, 'pack_size_kg', fp.pack_size_kg,
 *                'status', fp.status, 'cost_per_kg', fp.cost_per_kg
 *            ) ORDER BY fp.id)
 *            FROM finished_paint_packs fp WHERE fp.production_run_id = r.id
 *        ), '[]'::jsonb) AS packs
 *   FROM production_runs r
 *   JOIN users u ON u.id = r.created_by
 *   JOIN paint_variants v ON v.id = r.variant_id
 *   JOIN paints p ON p.id = v.paint_id
 *   JOIN formulas f ON f.id = r.formula_id
 *  WHERE r.id = :id!
 * ```
 */
export const getProductionRun = new PreparedQuery<IGetProductionRunParams,IGetProductionRunResult>(getProductionRunIR);


/** 'PickDefaultFormulaForVariant' parameters type */
export interface IPickDefaultFormulaForVariantParams {
  variant_id: number;
}

/** 'PickDefaultFormulaForVariant' return type */
export interface IPickDefaultFormulaForVariantResult {
  id: number;
}

/** 'PickDefaultFormulaForVariant' query type */
export interface IPickDefaultFormulaForVariantQuery {
  params: IPickDefaultFormulaForVariantParams;
  result: IPickDefaultFormulaForVariantResult;
}

const pickDefaultFormulaForVariantIR: any = {"usedParamSet":{"variant_id":true},"params":[{"name":"variant_id","required":true,"transform":{"type":"scalar"},"locs":[{"a":44,"b":55}]}],"statement":"SELECT id FROM formulas\n WHERE variant_id = :variant_id! AND archived_at IS NULL\n ORDER BY is_default DESC, created_at DESC LIMIT 1"};

/**
 * Query generated from SQL:
 * ```
 * SELECT id FROM formulas
 *  WHERE variant_id = :variant_id! AND archived_at IS NULL
 *  ORDER BY is_default DESC, created_at DESC LIMIT 1
 * ```
 */
export const pickDefaultFormulaForVariant = new PreparedQuery<IPickDefaultFormulaForVariantParams,IPickDefaultFormulaForVariantResult>(pickDefaultFormulaForVariantIR);


/** 'InsertProductionRun' parameters type */
export interface IInsertProductionRunParams {
  batch_number: string;
  expected_output_kg: NumberOrString;
  formula_id: number;
  notes?: string | null | void;
  request_id?: number | null | void;
  user_id: number;
  variant_id: number;
}

/** 'InsertProductionRun' return type */
export interface IInsertProductionRunResult {
  id: number;
}

/** 'InsertProductionRun' query type */
export interface IInsertProductionRunQuery {
  params: IInsertProductionRunParams;
  result: IInsertProductionRunResult;
}

const insertProductionRunIR: any = {"usedParamSet":{"batch_number":true,"request_id":true,"variant_id":true,"formula_id":true,"expected_output_kg":true,"notes":true,"user_id":true},"params":[{"name":"batch_number","required":true,"transform":{"type":"scalar"},"locs":[{"a":143,"b":156}]},{"name":"request_id","required":false,"transform":{"type":"scalar"},"locs":[{"a":159,"b":169}]},{"name":"variant_id","required":true,"transform":{"type":"scalar"},"locs":[{"a":172,"b":183}]},{"name":"formula_id","required":true,"transform":{"type":"scalar"},"locs":[{"a":186,"b":197}]},{"name":"expected_output_kg","required":true,"transform":{"type":"scalar"},"locs":[{"a":219,"b":238}]},{"name":"notes","required":false,"transform":{"type":"scalar"},"locs":[{"a":241,"b":246}]},{"name":"user_id","required":true,"transform":{"type":"scalar"},"locs":[{"a":249,"b":257}]}],"statement":"INSERT INTO production_runs\n    (batch_number, request_id, variant_id, formula_id, status,\n     expected_output_kg, notes, created_by)\nVALUES (:batch_number!, :request_id, :variant_id!, :formula_id!, 'planned',\n        :expected_output_kg!, :notes, :user_id!)\nRETURNING id"};

/**
 * Query generated from SQL:
 * ```
 * INSERT INTO production_runs
 *     (batch_number, request_id, variant_id, formula_id, status,
 *      expected_output_kg, notes, created_by)
 * VALUES (:batch_number!, :request_id, :variant_id!, :formula_id!, 'planned',
 *         :expected_output_kg!, :notes, :user_id!)
 * RETURNING id
 * ```
 */
export const insertProductionRun = new PreparedQuery<IInsertProductionRunParams,IInsertProductionRunResult>(insertProductionRunIR);


/** 'StartProductionRun' parameters type */
export interface IStartProductionRunParams {
  id: number;
}

/** 'StartProductionRun' return type */
export interface IStartProductionRunResult {
  id: number;
}

/** 'StartProductionRun' query type */
export interface IStartProductionRunQuery {
  params: IStartProductionRunParams;
  result: IStartProductionRunResult;
}

const startProductionRunIR: any = {"usedParamSet":{"id":true},"params":[{"name":"id","required":true,"transform":{"type":"scalar"},"locs":[{"a":129,"b":132}]}],"statement":"UPDATE production_runs\n   SET status = 'in_progress', started_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP\n WHERE id = :id! AND status = 'planned'\n RETURNING id"};

/**
 * Query generated from SQL:
 * ```
 * UPDATE production_runs
 *    SET status = 'in_progress', started_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
 *  WHERE id = :id! AND status = 'planned'
 *  RETURNING id
 * ```
 */
export const startProductionRun = new PreparedQuery<IStartProductionRunParams,IStartProductionRunResult>(startProductionRunIR);


/** 'LockRunForActuals' parameters type */
export interface ILockRunForActualsParams {
  id: number;
}

/** 'LockRunForActuals' return type */
export interface ILockRunForActualsResult {
  expected_output_kg: string;
  formula_id: number;
  resource_variance_threshold_pct: string | null;
  standard_output_kg: string;
  status: string | null;
  variant_id: number;
  wastage_threshold_pct: string | null;
}

/** 'LockRunForActuals' query type */
export interface ILockRunForActualsQuery {
  params: ILockRunForActualsParams;
  result: ILockRunForActualsResult;
}

const lockRunForActualsIR: any = {"usedParamSet":{"id":true},"params":[{"name":"id","required":true,"transform":{"type":"scalar"},"locs":[{"a":251,"b":254}]}],"statement":"SELECT r.status::text AS status, r.formula_id, r.variant_id, r.expected_output_kg,\n       f.standard_output_kg, f.wastage_threshold_pct, f.resource_variance_threshold_pct\n  FROM production_runs r\n  JOIN formulas f ON f.id = r.formula_id\n WHERE r.id = :id!\n FOR UPDATE OF r"};

/**
 * Query generated from SQL:
 * ```
 * SELECT r.status::text AS status, r.formula_id, r.variant_id, r.expected_output_kg,
 *        f.standard_output_kg, f.wastage_threshold_pct, f.resource_variance_threshold_pct
 *   FROM production_runs r
 *   JOIN formulas f ON f.id = r.formula_id
 *  WHERE r.id = :id!
 *  FOR UPDATE OF r
 * ```
 */
export const lockRunForActuals = new PreparedQuery<ILockRunForActualsParams,ILockRunForActualsResult>(lockRunForActualsIR);


/** 'GetFormulaResources' parameters type */
export interface IGetFormulaResourcesParams {
  formula_id: number;
}

/** 'GetFormulaResources' return type */
export interface IGetFormulaResourcesResult {
  quantity_kg: string;
  resource_id: number;
}

/** 'GetFormulaResources' query type */
export interface IGetFormulaResourcesQuery {
  params: IGetFormulaResourcesParams;
  result: IGetFormulaResourcesResult;
}

const getFormulaResourcesIR: any = {"usedParamSet":{"formula_id":true},"params":[{"name":"formula_id","required":true,"transform":{"type":"scalar"},"locs":[{"a":74,"b":85}]}],"statement":"SELECT resource_id, quantity_kg FROM formula_resources WHERE formula_id = :formula_id!"};

/**
 * Query generated from SQL:
 * ```
 * SELECT resource_id, quantity_kg FROM formula_resources WHERE formula_id = :formula_id!
 * ```
 */
export const getFormulaResources = new PreparedQuery<IGetFormulaResourcesParams,IGetFormulaResourcesResult>(getFormulaResourcesIR);


/** 'DeleteRunActuals' parameters type */
export interface IDeleteRunActualsParams {
  run_id: number;
}

/** 'DeleteRunActuals' return type */
export type IDeleteRunActualsResult = void;

/** 'DeleteRunActuals' query type */
export interface IDeleteRunActualsQuery {
  params: IDeleteRunActualsParams;
  result: IDeleteRunActualsResult;
}

const deleteRunActualsIR: any = {"usedParamSet":{"run_id":true},"params":[{"name":"run_id","required":true,"transform":{"type":"scalar"},"locs":[{"a":66,"b":73}]}],"statement":"DELETE FROM production_resource_actuals WHERE production_run_id = :run_id!"};

/**
 * Query generated from SQL:
 * ```
 * DELETE FROM production_resource_actuals WHERE production_run_id = :run_id!
 * ```
 */
export const deleteRunActuals = new PreparedQuery<IDeleteRunActualsParams,IDeleteRunActualsResult>(deleteRunActualsIR);


/** 'InsertRunActual' parameters type */
export interface IInsertRunActualParams {
  actual_kg: NumberOrString;
  expected_kg: NumberOrString;
  flagged: boolean;
  resource_id: number;
  run_id: number;
  variance_pct?: NumberOrString | null | void;
}

/** 'InsertRunActual' return type */
export type IInsertRunActualResult = void;

/** 'InsertRunActual' query type */
export interface IInsertRunActualQuery {
  params: IInsertRunActualParams;
  result: IInsertRunActualResult;
}

const insertRunActualIR: any = {"usedParamSet":{"run_id":true,"resource_id":true,"expected_kg":true,"actual_kg":true,"variance_pct":true,"flagged":true},"params":[{"name":"run_id","required":true,"transform":{"type":"scalar"},"locs":[{"a":132,"b":139}]},{"name":"resource_id","required":true,"transform":{"type":"scalar"},"locs":[{"a":142,"b":154}]},{"name":"expected_kg","required":true,"transform":{"type":"scalar"},"locs":[{"a":157,"b":169}]},{"name":"actual_kg","required":true,"transform":{"type":"scalar"},"locs":[{"a":172,"b":182}]},{"name":"variance_pct","required":false,"transform":{"type":"scalar"},"locs":[{"a":185,"b":197}]},{"name":"flagged","required":true,"transform":{"type":"scalar"},"locs":[{"a":200,"b":208}]}],"statement":"INSERT INTO production_resource_actuals\n    (production_run_id, resource_id, expected_kg, actual_kg, variance_pct, flagged)\nVALUES (:run_id!, :resource_id!, :expected_kg!, :actual_kg!, :variance_pct, :flagged!)"};

/**
 * Query generated from SQL:
 * ```
 * INSERT INTO production_resource_actuals
 *     (production_run_id, resource_id, expected_kg, actual_kg, variance_pct, flagged)
 * VALUES (:run_id!, :resource_id!, :expected_kg!, :actual_kg!, :variance_pct, :flagged!)
 * ```
 */
export const insertRunActual = new PreparedQuery<IInsertRunActualParams,IInsertRunActualResult>(insertRunActualIR);


/** 'InsertConsumptionTxn' parameters type */
export interface IInsertConsumptionTxnParams {
  quantity_kg: NumberOrString;
  resource_id: number;
  run_id: NumberOrString;
  user_id: number;
}

/** 'InsertConsumptionTxn' return type */
export type IInsertConsumptionTxnResult = void;

/** 'InsertConsumptionTxn' query type */
export interface IInsertConsumptionTxnQuery {
  params: IInsertConsumptionTxnParams;
  result: IInsertConsumptionTxnResult;
}

const insertConsumptionTxnIR: any = {"usedParamSet":{"resource_id":true,"quantity_kg":true,"run_id":true,"user_id":true},"params":[{"name":"resource_id","required":true,"transform":{"type":"scalar"},"locs":[{"a":138,"b":150}]},{"name":"quantity_kg","required":true,"transform":{"type":"scalar"},"locs":[{"a":179,"b":191}]},{"name":"run_id","required":true,"transform":{"type":"scalar"},"locs":[{"a":212,"b":219}]},{"name":"user_id","required":true,"transform":{"type":"scalar"},"locs":[{"a":228,"b":236}]}],"statement":"INSERT INTO resource_stock_transactions\n    (resource_id, txn_type, quantity_kg, reference_type, reference_id, notes, created_by)\nVALUES (:resource_id!, 'production_consumption', :quantity_kg!, 'production_run', :run_id!, NULL, :user_id!)"};

/**
 * Query generated from SQL:
 * ```
 * INSERT INTO resource_stock_transactions
 *     (resource_id, txn_type, quantity_kg, reference_type, reference_id, notes, created_by)
 * VALUES (:resource_id!, 'production_consumption', :quantity_kg!, 'production_run', :run_id!, NULL, :user_id!)
 * ```
 */
export const insertConsumptionTxn = new PreparedQuery<IInsertConsumptionTxnParams,IInsertConsumptionTxnResult>(insertConsumptionTxnIR);


/** 'UpdateRunActualsHeader' parameters type */
export interface IUpdateRunActualsHeaderParams {
  actual_output_kg: NumberOrString;
  id: number;
  wastage_flagged: boolean;
  wastage_pct: NumberOrString;
}

/** 'UpdateRunActualsHeader' return type */
export type IUpdateRunActualsHeaderResult = void;

/** 'UpdateRunActualsHeader' query type */
export interface IUpdateRunActualsHeaderQuery {
  params: IUpdateRunActualsHeaderParams;
  result: IUpdateRunActualsHeaderResult;
}

const updateRunActualsHeaderIR: any = {"usedParamSet":{"actual_output_kg":true,"wastage_pct":true,"wastage_flagged":true,"id":true},"params":[{"name":"actual_output_kg","required":true,"transform":{"type":"scalar"},"locs":[{"a":49,"b":66}]},{"name":"wastage_pct","required":true,"transform":{"type":"scalar"},"locs":[{"a":95,"b":107}]},{"name":"wastage_flagged","required":true,"transform":{"type":"scalar"},"locs":[{"a":136,"b":152}]},{"name":"id","required":true,"transform":{"type":"scalar"},"locs":[{"a":392,"b":395}]}],"statement":"UPDATE production_runs\n   SET actual_output_kg = :actual_output_kg!,\n       wastage_pct      = :wastage_pct!,\n       wastage_flagged  = :wastage_flagged!,\n       status           = CASE WHEN status = 'planned' THEN 'in_progress'::production_run_status ELSE status END,\n       started_at       = COALESCE(started_at, CURRENT_TIMESTAMP),\n       updated_at       = CURRENT_TIMESTAMP\n WHERE id = :id!"};

/**
 * Query generated from SQL:
 * ```
 * UPDATE production_runs
 *    SET actual_output_kg = :actual_output_kg!,
 *        wastage_pct      = :wastage_pct!,
 *        wastage_flagged  = :wastage_flagged!,
 *        status           = CASE WHEN status = 'planned' THEN 'in_progress'::production_run_status ELSE status END,
 *        started_at       = COALESCE(started_at, CURRENT_TIMESTAMP),
 *        updated_at       = CURRENT_TIMESTAMP
 *  WHERE id = :id!
 * ```
 */
export const updateRunActualsHeader = new PreparedQuery<IUpdateRunActualsHeaderParams,IUpdateRunActualsHeaderResult>(updateRunActualsHeaderIR);


/** 'LockRunForDilution' parameters type */
export interface ILockRunForDilutionParams {
  id: number;
}

/** 'LockRunForDilution' return type */
export interface ILockRunForDilutionResult {
  actual_output_kg: string | null;
  dilution_threshold_pct: string | null;
  status: string | null;
}

/** 'LockRunForDilution' query type */
export interface ILockRunForDilutionQuery {
  params: ILockRunForDilutionParams;
  result: ILockRunForDilutionResult;
}

const lockRunForDilutionIR: any = {"usedParamSet":{"id":true},"params":[{"name":"id","required":true,"transform":{"type":"scalar"},"locs":[{"a":158,"b":161}]}],"statement":"SELECT r.status::text AS status, r.actual_output_kg, f.dilution_threshold_pct\n  FROM production_runs r\n  JOIN formulas f ON f.id = r.formula_id\n WHERE r.id = :id!\n FOR UPDATE OF r"};

/**
 * Query generated from SQL:
 * ```
 * SELECT r.status::text AS status, r.actual_output_kg, f.dilution_threshold_pct
 *   FROM production_runs r
 *   JOIN formulas f ON f.id = r.formula_id
 *  WHERE r.id = :id!
 *  FOR UPDATE OF r
 * ```
 */
export const lockRunForDilution = new PreparedQuery<ILockRunForDilutionParams,ILockRunForDilutionResult>(lockRunForDilutionIR);


/** 'InsertDilutionRow' parameters type */
export interface IInsertDilutionRowParams {
  kg_added: NumberOrString;
  notes?: string | null | void;
  resource_id: number;
  run_id: number;
}

/** 'InsertDilutionRow' return type */
export type IInsertDilutionRowResult = void;

/** 'InsertDilutionRow' query type */
export interface IInsertDilutionRowQuery {
  params: IInsertDilutionRowParams;
  result: IInsertDilutionRowResult;
}

const insertDilutionRowIR: any = {"usedParamSet":{"run_id":true,"resource_id":true,"kg_added":true,"notes":true},"params":[{"name":"run_id","required":true,"transform":{"type":"scalar"},"locs":[{"a":102,"b":109}]},{"name":"resource_id","required":true,"transform":{"type":"scalar"},"locs":[{"a":112,"b":124}]},{"name":"kg_added","required":true,"transform":{"type":"scalar"},"locs":[{"a":127,"b":136}]},{"name":"notes","required":false,"transform":{"type":"scalar"},"locs":[{"a":139,"b":144}]}],"statement":"INSERT INTO production_dilution_adjustments (production_run_id, resource_id, kg_added, notes)\nVALUES (:run_id!, :resource_id!, :kg_added!, :notes)"};

/**
 * Query generated from SQL:
 * ```
 * INSERT INTO production_dilution_adjustments (production_run_id, resource_id, kg_added, notes)
 * VALUES (:run_id!, :resource_id!, :kg_added!, :notes)
 * ```
 */
export const insertDilutionRow = new PreparedQuery<IInsertDilutionRowParams,IInsertDilutionRowResult>(insertDilutionRowIR);


/** 'InsertDilutionConsumptionTxn' parameters type */
export interface IInsertDilutionConsumptionTxnParams {
  notes?: string | null | void;
  quantity_kg: NumberOrString;
  resource_id: number;
  run_id: NumberOrString;
  user_id: number;
}

/** 'InsertDilutionConsumptionTxn' return type */
export type IInsertDilutionConsumptionTxnResult = void;

/** 'InsertDilutionConsumptionTxn' query type */
export interface IInsertDilutionConsumptionTxnQuery {
  params: IInsertDilutionConsumptionTxnParams;
  result: IInsertDilutionConsumptionTxnResult;
}

const insertDilutionConsumptionTxnIR: any = {"usedParamSet":{"resource_id":true,"quantity_kg":true,"run_id":true,"notes":true,"user_id":true},"params":[{"name":"resource_id","required":true,"transform":{"type":"scalar"},"locs":[{"a":138,"b":150}]},{"name":"quantity_kg","required":true,"transform":{"type":"scalar"},"locs":[{"a":177,"b":189}]},{"name":"run_id","required":true,"transform":{"type":"scalar"},"locs":[{"a":210,"b":217}]},{"name":"notes","required":false,"transform":{"type":"scalar"},"locs":[{"a":220,"b":225}]},{"name":"user_id","required":true,"transform":{"type":"scalar"},"locs":[{"a":228,"b":236}]}],"statement":"INSERT INTO resource_stock_transactions\n    (resource_id, txn_type, quantity_kg, reference_type, reference_id, notes, created_by)\nVALUES (:resource_id!, 'dilution_consumption', :quantity_kg!, 'production_run', :run_id!, :notes, :user_id!)"};

/**
 * Query generated from SQL:
 * ```
 * INSERT INTO resource_stock_transactions
 *     (resource_id, txn_type, quantity_kg, reference_type, reference_id, notes, created_by)
 * VALUES (:resource_id!, 'dilution_consumption', :quantity_kg!, 'production_run', :run_id!, :notes, :user_id!)
 * ```
 */
export const insertDilutionConsumptionTxn = new PreparedQuery<IInsertDilutionConsumptionTxnParams,IInsertDilutionConsumptionTxnResult>(insertDilutionConsumptionTxnIR);


/** 'SumDilutionForRun' parameters type */
export interface ISumDilutionForRunParams {
  run_id: number;
}

/** 'SumDilutionForRun' return type */
export interface ISumDilutionForRunResult {
  total: string | null;
}

/** 'SumDilutionForRun' query type */
export interface ISumDilutionForRunQuery {
  params: ISumDilutionForRunParams;
  result: ISumDilutionForRunResult;
}

const sumDilutionForRunIR: any = {"usedParamSet":{"run_id":true},"params":[{"name":"run_id","required":true,"transform":{"type":"scalar"},"locs":[{"a":106,"b":113}]}],"statement":"SELECT COALESCE(SUM(kg_added), 0) AS total FROM production_dilution_adjustments WHERE production_run_id = :run_id!"};

/**
 * Query generated from SQL:
 * ```
 * SELECT COALESCE(SUM(kg_added), 0) AS total FROM production_dilution_adjustments WHERE production_run_id = :run_id!
 * ```
 */
export const sumDilutionForRun = new PreparedQuery<ISumDilutionForRunParams,ISumDilutionForRunResult>(sumDilutionForRunIR);


/** 'UpdateRunDilutionTotals' parameters type */
export interface IUpdateRunDilutionTotalsParams {
  flagged: boolean;
  id: number;
  total: NumberOrString;
}

/** 'UpdateRunDilutionTotals' return type */
export type IUpdateRunDilutionTotalsResult = void;

/** 'UpdateRunDilutionTotals' query type */
export interface IUpdateRunDilutionTotalsQuery {
  params: IUpdateRunDilutionTotalsParams;
  result: IUpdateRunDilutionTotalsResult;
}

const updateRunDilutionTotalsIR: any = {"usedParamSet":{"total":true,"flagged":true,"id":true},"params":[{"name":"total","required":true,"transform":{"type":"scalar"},"locs":[{"a":50,"b":56}]},{"name":"flagged","required":true,"transform":{"type":"scalar"},"locs":[{"a":86,"b":94}]},{"name":"id","required":true,"transform":{"type":"scalar"},"locs":[{"a":154,"b":157}]}],"statement":"UPDATE production_runs\n   SET dilution_total_kg = :total!,\n       dilution_flagged  = :flagged!,\n       updated_at        = CURRENT_TIMESTAMP\n WHERE id = :id!"};

/**
 * Query generated from SQL:
 * ```
 * UPDATE production_runs
 *    SET dilution_total_kg = :total!,
 *        dilution_flagged  = :flagged!,
 *        updated_at        = CURRENT_TIMESTAMP
 *  WHERE id = :id!
 * ```
 */
export const updateRunDilutionTotals = new PreparedQuery<IUpdateRunDilutionTotalsParams,IUpdateRunDilutionTotalsResult>(updateRunDilutionTotalsIR);


/** 'LockRunForPackaging' parameters type */
export interface ILockRunForPackagingParams {
  id: number;
}

/** 'LockRunForPackaging' return type */
export interface ILockRunForPackagingResult {
  actual_output_kg: string | null;
  dilution_total_kg: string;
  formula_id: number;
  status: string | null;
  variant_id: number;
}

/** 'LockRunForPackaging' query type */
export interface ILockRunForPackagingQuery {
  params: ILockRunForPackagingParams;
  result: ILockRunForPackagingResult;
}

const lockRunForPackagingIR: any = {"usedParamSet":{"id":true},"params":[{"name":"id","required":true,"transform":{"type":"scalar"},"locs":[{"a":125,"b":128}]}],"statement":"SELECT variant_id, actual_output_kg, dilution_total_kg, status::text AS status, formula_id\n  FROM production_runs WHERE id = :id! FOR UPDATE"};

/**
 * Query generated from SQL:
 * ```
 * SELECT variant_id, actual_output_kg, dilution_total_kg, status::text AS status, formula_id
 *   FROM production_runs WHERE id = :id! FOR UPDATE
 * ```
 */
export const lockRunForPackaging = new PreparedQuery<ILockRunForPackagingParams,ILockRunForPackagingResult>(lockRunForPackagingIR);


/** 'ActivePackSizesIn' parameters type */
export interface IActivePackSizesInParams {
  sizes: NumberOrStringArray;
}

/** 'ActivePackSizesIn' return type */
export interface IActivePackSizesInResult {
  pack_size_kg: string;
}

/** 'ActivePackSizesIn' query type */
export interface IActivePackSizesInQuery {
  params: IActivePackSizesInParams;
  result: IActivePackSizesInResult;
}

const activePackSizesInIR: any = {"usedParamSet":{"sizes":true},"params":[{"name":"sizes","required":true,"transform":{"type":"scalar"},"locs":[{"a":75,"b":81}]}],"statement":"SELECT pack_size_kg FROM pack_sizes WHERE is_active AND pack_size_kg = ANY(:sizes!::numeric[])"};

/**
 * Query generated from SQL:
 * ```
 * SELECT pack_size_kg FROM pack_sizes WHERE is_active AND pack_size_kg = ANY(:sizes!::numeric[])
 * ```
 */
export const activePackSizesIn = new PreparedQuery<IActivePackSizesInParams,IActivePackSizesInResult>(activePackSizesInIR);


/** 'FormulaCostBaseline' parameters type */
export interface IFormulaCostBaselineParams {
  formula_id: number;
}

/** 'FormulaCostBaseline' return type */
export interface IFormulaCostBaselineResult {
  standard_output_kg: string;
  total_cost: string | null;
}

/** 'FormulaCostBaseline' query type */
export interface IFormulaCostBaselineQuery {
  params: IFormulaCostBaselineParams;
  result: IFormulaCostBaselineResult;
}

const formulaCostBaselineIR: any = {"usedParamSet":{"formula_id":true},"params":[{"name":"formula_id","required":true,"transform":{"type":"scalar"},"locs":[{"a":240,"b":251}]}],"statement":"SELECT COALESCE(SUM(fr.quantity_kg * r.weighted_avg_cost_per_kg), 0) AS total_cost,\n       f.standard_output_kg\n  FROM formulas f\n  JOIN formula_resources fr ON fr.formula_id = f.id\n  JOIN resources r ON r.id = fr.resource_id\n WHERE f.id = :formula_id!\n GROUP BY f.standard_output_kg"};

/**
 * Query generated from SQL:
 * ```
 * SELECT COALESCE(SUM(fr.quantity_kg * r.weighted_avg_cost_per_kg), 0) AS total_cost,
 *        f.standard_output_kg
 *   FROM formulas f
 *   JOIN formula_resources fr ON fr.formula_id = f.id
 *   JOIN resources r ON r.id = fr.resource_id
 *  WHERE f.id = :formula_id!
 *  GROUP BY f.standard_output_kg
 * ```
 */
export const formulaCostBaseline = new PreparedQuery<IFormulaCostBaselineParams,IFormulaCostBaselineResult>(formulaCostBaselineIR);


/** 'InsertProducedPack' parameters type */
export interface IInsertProducedPackParams {
  cost_per_kg: NumberOrString;
  location?: string | null | void;
  pack_size_kg: NumberOrString;
  run_id: number;
  variant_id: number;
}

/** 'InsertProducedPack' return type */
export type IInsertProducedPackResult = void;

/** 'InsertProducedPack' query type */
export interface IInsertProducedPackQuery {
  params: IInsertProducedPackParams;
  result: IInsertProducedPackResult;
}

const insertProducedPackIR: any = {"usedParamSet":{"variant_id":true,"pack_size_kg":true,"run_id":true,"cost_per_kg":true,"location":true},"params":[{"name":"variant_id","required":true,"transform":{"type":"scalar"},"locs":[{"a":130,"b":141}]},{"name":"pack_size_kg","required":true,"transform":{"type":"scalar"},"locs":[{"a":144,"b":157}]},{"name":"run_id","required":true,"transform":{"type":"scalar"},"locs":[{"a":172,"b":179}]},{"name":"cost_per_kg","required":true,"transform":{"type":"scalar"},"locs":[{"a":182,"b":194}]},{"name":"location","required":false,"transform":{"type":"scalar"},"locs":[{"a":209,"b":217}]}],"statement":"INSERT INTO finished_paint_packs\n    (variant_id, pack_size_kg, source, production_run_id, cost_per_kg, status, location)\nVALUES (:variant_id!, :pack_size_kg!, 'produced', :run_id!, :cost_per_kg!, 'in_stock', :location)"};

/**
 * Query generated from SQL:
 * ```
 * INSERT INTO finished_paint_packs
 *     (variant_id, pack_size_kg, source, production_run_id, cost_per_kg, status, location)
 * VALUES (:variant_id!, :pack_size_kg!, 'produced', :run_id!, :cost_per_kg!, 'in_stock', :location)
 * ```
 */
export const insertProducedPack = new PreparedQuery<IInsertProducedPackParams,IInsertProducedPackResult>(insertProducedPackIR);


/** 'InsertStashTxn' parameters type */
export interface IInsertStashTxnParams {
  action: stash_txn_action;
  delta_kg: NumberOrString;
  notes?: string | null | void;
  run_id?: number | null | void;
  user_id: number;
  variant_id: number;
}

/** 'InsertStashTxn' return type */
export type IInsertStashTxnResult = void;

/** 'InsertStashTxn' query type */
export interface IInsertStashTxnQuery {
  params: IInsertStashTxnParams;
  result: IInsertStashTxnResult;
}

const insertStashTxnIR: any = {"usedParamSet":{"variant_id":true,"delta_kg":true,"action":true,"run_id":true,"notes":true,"user_id":true},"params":[{"name":"variant_id","required":true,"transform":{"type":"scalar"},"locs":[{"a":112,"b":123}]},{"name":"delta_kg","required":true,"transform":{"type":"scalar"},"locs":[{"a":126,"b":135}]},{"name":"action","required":true,"transform":{"type":"scalar"},"locs":[{"a":138,"b":145}]},{"name":"run_id","required":false,"transform":{"type":"scalar"},"locs":[{"a":166,"b":172}]},{"name":"notes","required":false,"transform":{"type":"scalar"},"locs":[{"a":175,"b":180}]},{"name":"user_id","required":true,"transform":{"type":"scalar"},"locs":[{"a":183,"b":191}]}],"statement":"INSERT INTO stash_transactions\n    (variant_id, delta_kg, action, production_run_id, notes, created_by)\nVALUES (:variant_id!, :delta_kg!, :action!::stash_txn_action, :run_id, :notes, :user_id!)"};

/**
 * Query generated from SQL:
 * ```
 * INSERT INTO stash_transactions
 *     (variant_id, delta_kg, action, production_run_id, notes, created_by)
 * VALUES (:variant_id!, :delta_kg!, :action!::stash_txn_action, :run_id, :notes, :user_id!)
 * ```
 */
export const insertStashTxn = new PreparedQuery<IInsertStashTxnParams,IInsertStashTxnResult>(insertStashTxnIR);


/** 'CompleteRun' parameters type */
export interface ICompleteRunParams {
  id: number;
}

/** 'CompleteRun' return type */
export interface ICompleteRunResult {
  request_id: number | null;
}

/** 'CompleteRun' query type */
export interface ICompleteRunQuery {
  params: ICompleteRunParams;
  result: ICompleteRunResult;
}

const completeRunIR: any = {"usedParamSet":{"id":true},"params":[{"name":"id","required":true,"transform":{"type":"scalar"},"locs":[{"a":129,"b":132}]}],"statement":"UPDATE production_runs\n   SET status = 'completed', completed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP\n WHERE id = :id! AND status IN ('planned', 'in_progress')\n RETURNING request_id"};

/**
 * Query generated from SQL:
 * ```
 * UPDATE production_runs
 *    SET status = 'completed', completed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
 *  WHERE id = :id! AND status IN ('planned', 'in_progress')
 *  RETURNING request_id
 * ```
 */
export const completeRun = new PreparedQuery<ICompleteRunParams,ICompleteRunResult>(completeRunIR);


/** 'CancelRun' parameters type */
export interface ICancelRunParams {
  id: number;
}

/** 'CancelRun' return type */
export interface ICancelRunResult {
  id: number;
}

/** 'CancelRun' query type */
export interface ICancelRunQuery {
  params: ICancelRunParams;
  result: ICancelRunResult;
}

const cancelRunIR: any = {"usedParamSet":{"id":true},"params":[{"name":"id","required":true,"transform":{"type":"scalar"},"locs":[{"a":92,"b":95}]}],"statement":"UPDATE production_runs SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP\n WHERE id = :id! AND status IN ('planned', 'in_progress')\n RETURNING id"};

/**
 * Query generated from SQL:
 * ```
 * UPDATE production_runs SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP
 *  WHERE id = :id! AND status IN ('planned', 'in_progress')
 *  RETURNING id
 * ```
 */
export const cancelRun = new PreparedQuery<ICancelRunParams,ICancelRunResult>(cancelRunIR);


/** 'MarkPackReady' parameters type */
export interface IMarkPackReadyParams {
  id: NumberOrString;
}

/** 'MarkPackReady' return type */
export interface IMarkPackReadyResult {
  id: string;
}

/** 'MarkPackReady' query type */
export interface IMarkPackReadyQuery {
  params: IMarkPackReadyParams;
  result: IMarkPackReadyResult;
}

const markPackReadyIR: any = {"usedParamSet":{"id":true},"params":[{"name":"id","required":true,"transform":{"type":"scalar"},"locs":[{"a":109,"b":112}]}],"statement":"UPDATE finished_paint_packs\n   SET status = 'ready_for_shipment', updated_at = CURRENT_TIMESTAMP\n WHERE id = :id! AND status = 'in_stock'\n RETURNING id"};

/**
 * Query generated from SQL:
 * ```
 * UPDATE finished_paint_packs
 *    SET status = 'ready_for_shipment', updated_at = CURRENT_TIMESTAMP
 *  WHERE id = :id! AND status = 'in_stock'
 *  RETURNING id
 * ```
 */
export const markPackReady = new PreparedQuery<IMarkPackReadyParams,IMarkPackReadyResult>(markPackReadyIR);


/** 'LockStashForRepack' parameters type */
export interface ILockStashForRepackParams {
  variant_id: number;
}

/** 'LockStashForRepack' return type */
export interface ILockStashForRepackResult {
  kg_remaining: string;
}

/** 'LockStashForRepack' query type */
export interface ILockStashForRepackQuery {
  params: ILockStashForRepackParams;
  result: ILockStashForRepackResult;
}

const lockStashForRepackIR: any = {"usedParamSet":{"variant_id":true},"params":[{"name":"variant_id","required":true,"transform":{"type":"scalar"},"locs":[{"a":64,"b":75}]}],"statement":"SELECT kg_remaining FROM paint_variant_stash WHERE variant_id = :variant_id! FOR UPDATE"};

/**
 * Query generated from SQL:
 * ```
 * SELECT kg_remaining FROM paint_variant_stash WHERE variant_id = :variant_id! FOR UPDATE
 * ```
 */
export const lockStashForRepack = new PreparedQuery<ILockStashForRepackParams,ILockStashForRepackResult>(lockStashForRepackIR);


/** 'ActivePackSizeExists' parameters type */
export interface IActivePackSizeExistsParams {
  pack_size_kg: NumberOrString;
}

/** 'ActivePackSizeExists' return type */
export interface IActivePackSizeExistsResult {
  one: number | null;
}

/** 'ActivePackSizeExists' query type */
export interface IActivePackSizeExistsQuery {
  params: IActivePackSizeExistsParams;
  result: IActivePackSizeExistsResult;
}

const activePackSizeExistsIR: any = {"usedParamSet":{"pack_size_kg":true},"params":[{"name":"pack_size_kg","required":true,"transform":{"type":"scalar"},"locs":[{"a":67,"b":80}]}],"statement":"SELECT 1 AS one FROM pack_sizes WHERE is_active AND pack_size_kg = :pack_size_kg!"};

/**
 * Query generated from SQL:
 * ```
 * SELECT 1 AS one FROM pack_sizes WHERE is_active AND pack_size_kg = :pack_size_kg!
 * ```
 */
export const activePackSizeExists = new PreparedQuery<IActivePackSizeExistsParams,IActivePackSizeExistsResult>(activePackSizeExistsIR);


/** 'LatestProducedPackCost' parameters type */
export interface ILatestProducedPackCostParams {
  variant_id: number;
}

/** 'LatestProducedPackCost' return type */
export interface ILatestProducedPackCostResult {
  cost_per_kg: string;
}

/** 'LatestProducedPackCost' query type */
export interface ILatestProducedPackCostQuery {
  params: ILatestProducedPackCostParams;
  result: ILatestProducedPackCostResult;
}

const latestProducedPackCostIR: any = {"usedParamSet":{"variant_id":true},"params":[{"name":"variant_id","required":true,"transform":{"type":"scalar"},"locs":[{"a":65,"b":76}]}],"statement":"SELECT cost_per_kg FROM finished_paint_packs\n WHERE variant_id = :variant_id! AND source = 'produced'\n ORDER BY created_at DESC LIMIT 1"};

/**
 * Query generated from SQL:
 * ```
 * SELECT cost_per_kg FROM finished_paint_packs
 *  WHERE variant_id = :variant_id! AND source = 'produced'
 *  ORDER BY created_at DESC LIMIT 1
 * ```
 */
export const latestProducedPackCost = new PreparedQuery<ILatestProducedPackCostParams,ILatestProducedPackCostResult>(latestProducedPackCostIR);


/** 'LatestRunForVariant' parameters type */
export interface ILatestRunForVariantParams {
  variant_id: number;
}

/** 'LatestRunForVariant' return type */
export interface ILatestRunForVariantResult {
  id: number;
}

/** 'LatestRunForVariant' query type */
export interface ILatestRunForVariantQuery {
  params: ILatestRunForVariantParams;
  result: ILatestRunForVariantResult;
}

const latestRunForVariantIR: any = {"usedParamSet":{"variant_id":true},"params":[{"name":"variant_id","required":true,"transform":{"type":"scalar"},"locs":[{"a":50,"b":61}]}],"statement":"SELECT id FROM production_runs WHERE variant_id = :variant_id! ORDER BY created_at DESC LIMIT 1"};

/**
 * Query generated from SQL:
 * ```
 * SELECT id FROM production_runs WHERE variant_id = :variant_id! ORDER BY created_at DESC LIMIT 1
 * ```
 */
export const latestRunForVariant = new PreparedQuery<ILatestRunForVariantParams,ILatestRunForVariantResult>(latestRunForVariantIR);


/** 'InsertProducedPackForRepack' parameters type */
export interface IInsertProducedPackForRepackParams {
  cost_per_kg: NumberOrString;
  pack_size_kg: NumberOrString;
  production_run_id?: number | null | void;
  variant_id: number;
}

/** 'InsertProducedPackForRepack' return type */
export type IInsertProducedPackForRepackResult = void;

/** 'InsertProducedPackForRepack' query type */
export interface IInsertProducedPackForRepackQuery {
  params: IInsertProducedPackForRepackParams;
  result: IInsertProducedPackForRepackResult;
}

const insertProducedPackForRepackIR: any = {"usedParamSet":{"variant_id":true,"pack_size_kg":true,"production_run_id":true,"cost_per_kg":true},"params":[{"name":"variant_id","required":true,"transform":{"type":"scalar"},"locs":[{"a":120,"b":131}]},{"name":"pack_size_kg","required":true,"transform":{"type":"scalar"},"locs":[{"a":134,"b":147}]},{"name":"production_run_id","required":false,"transform":{"type":"scalar"},"locs":[{"a":162,"b":179}]},{"name":"cost_per_kg","required":true,"transform":{"type":"scalar"},"locs":[{"a":182,"b":194}]}],"statement":"INSERT INTO finished_paint_packs\n    (variant_id, pack_size_kg, source, production_run_id, cost_per_kg, status)\nVALUES (:variant_id!, :pack_size_kg!, 'produced', :production_run_id, :cost_per_kg!, 'in_stock')"};

/**
 * Query generated from SQL:
 * ```
 * INSERT INTO finished_paint_packs
 *     (variant_id, pack_size_kg, source, production_run_id, cost_per_kg, status)
 * VALUES (:variant_id!, :pack_size_kg!, 'produced', :production_run_id, :cost_per_kg!, 'in_stock')
 * ```
 */
export const insertProducedPackForRepack = new PreparedQuery<IInsertProducedPackForRepackParams,IInsertProducedPackForRepackResult>(insertProducedPackForRepackIR);


/** 'ProductionRunsByStatus' parameters type */
export type IProductionRunsByStatusParams = void;

/** 'ProductionRunsByStatus' return type */
export interface IProductionRunsByStatusResult {
  count: string | null;
  status: string | null;
}

/** 'ProductionRunsByStatus' query type */
export interface IProductionRunsByStatusQuery {
  params: IProductionRunsByStatusParams;
  result: IProductionRunsByStatusResult;
}

const productionRunsByStatusIR: any = {"usedParamSet":{},"params":[],"statement":"SELECT status::text AS status, COUNT(*) AS count\n  FROM production_runs WHERE archived_at IS NULL\n GROUP BY status"};

/**
 * Query generated from SQL:
 * ```
 * SELECT status::text AS status, COUNT(*) AS count
 *   FROM production_runs WHERE archived_at IS NULL
 *  GROUP BY status
 * ```
 */
export const productionRunsByStatus = new PreparedQuery<IProductionRunsByStatusParams,IProductionRunsByStatusResult>(productionRunsByStatusIR);


/** 'FlaggedRunsLast30' parameters type */
export type IFlaggedRunsLast30Params = void;

/** 'FlaggedRunsLast30' return type */
export interface IFlaggedRunsLast30Result {
  flagged_runs: string | null;
}

/** 'FlaggedRunsLast30' query type */
export interface IFlaggedRunsLast30Query {
  params: IFlaggedRunsLast30Params;
  result: IFlaggedRunsLast30Result;
}

const flaggedRunsLast30IR: any = {"usedParamSet":{},"params":[],"statement":"SELECT COUNT(*) AS flagged_runs\n  FROM production_runs\n WHERE completed_at >= NOW() - INTERVAL '30 days'\n   AND (wastage_flagged OR dilution_flagged OR EXISTS (\n        SELECT 1 FROM production_resource_actuals a\n         WHERE a.production_run_id = production_runs.id AND a.flagged\n   ))"};

/**
 * Query generated from SQL:
 * ```
 * SELECT COUNT(*) AS flagged_runs
 *   FROM production_runs
 *  WHERE completed_at >= NOW() - INTERVAL '30 days'
 *    AND (wastage_flagged OR dilution_flagged OR EXISTS (
 *         SELECT 1 FROM production_resource_actuals a
 *          WHERE a.production_run_id = production_runs.id AND a.flagged
 *    ))
 * ```
 */
export const flaggedRunsLast30 = new PreparedQuery<IFlaggedRunsLast30Params,IFlaggedRunsLast30Result>(flaggedRunsLast30IR);


/** 'ListCustomerOrders' parameters type */
export interface IListCustomerOrdersParams {
  customer_id?: number | null | void;
  page_offset: NumberOrString;
  page_size: NumberOrString;
  status?: order_status | null | void;
}

/** 'ListCustomerOrders' return type */
export interface IListCustomerOrdersResult {
  _total: string | null;
  approved_at: Date | null;
  approved_by: number | null;
  created_by: number;
  created_by_name: string;
  currency: string;
  customer_id: number;
  customer_name: string;
  due_date: Date | null;
  id: number;
  item_count: string | null;
  order_date: Date;
  payment_net_days: number | null;
  payment_terms: string | null;
  scheduled_ship_date: Date | null;
  status: string | null;
}

/** 'ListCustomerOrders' query type */
export interface IListCustomerOrdersQuery {
  params: IListCustomerOrdersParams;
  result: IListCustomerOrdersResult;
}

const listCustomerOrdersIR: any = {"usedParamSet":{"status":true,"customer_id":true,"page_size":true,"page_offset":true},"params":[{"name":"status","required":false,"transform":{"type":"scalar"},"locs":[{"a":575,"b":581},{"a":619,"b":625}]},{"name":"customer_id","required":false,"transform":{"type":"scalar"},"locs":[{"a":636,"b":647},{"a":685,"b":696}]},{"name":"page_size","required":true,"transform":{"type":"scalar"},"locs":[{"a":734,"b":744}]},{"name":"page_offset","required":true,"transform":{"type":"scalar"},"locs":[{"a":753,"b":765}]}],"statement":"SELECT o.id, o.customer_id, c.name AS customer_name,\n       o.status::text AS status, o.currency,\n       o.payment_terms::text AS payment_terms, o.payment_net_days,\n       o.order_date, o.scheduled_ship_date, o.due_date,\n       o.created_by, o.approved_by, o.approved_at,\n       u.username AS created_by_name,\n       (SELECT COUNT(*) FROM customer_order_items WHERE order_id = o.id) AS item_count,\n       COUNT(*) OVER () AS _total\n  FROM customer_orders o\n  JOIN customers c ON c.id = o.customer_id\n  JOIN users u ON u.id = o.created_by\n WHERE o.archived_at IS NULL\n   AND (:status::order_status IS NULL OR o.status = :status)\n   AND (:customer_id::int     IS NULL OR o.customer_id = :customer_id)\n ORDER BY o.created_at DESC\n LIMIT :page_size! OFFSET :page_offset!"};

/**
 * Query generated from SQL:
 * ```
 * SELECT o.id, o.customer_id, c.name AS customer_name,
 *        o.status::text AS status, o.currency,
 *        o.payment_terms::text AS payment_terms, o.payment_net_days,
 *        o.order_date, o.scheduled_ship_date, o.due_date,
 *        o.created_by, o.approved_by, o.approved_at,
 *        u.username AS created_by_name,
 *        (SELECT COUNT(*) FROM customer_order_items WHERE order_id = o.id) AS item_count,
 *        COUNT(*) OVER () AS _total
 *   FROM customer_orders o
 *   JOIN customers c ON c.id = o.customer_id
 *   JOIN users u ON u.id = o.created_by
 *  WHERE o.archived_at IS NULL
 *    AND (:status::order_status IS NULL OR o.status = :status)
 *    AND (:customer_id::int     IS NULL OR o.customer_id = :customer_id)
 *  ORDER BY o.created_at DESC
 *  LIMIT :page_size! OFFSET :page_offset!
 * ```
 */
export const listCustomerOrders = new PreparedQuery<IListCustomerOrdersParams,IListCustomerOrdersResult>(listCustomerOrdersIR);


/** 'GetCustomerOrder' parameters type */
export interface IGetCustomerOrderParams {
  id: number;
}

/** 'GetCustomerOrder' return type */
export interface IGetCustomerOrderResult {
  approved_at: Date | null;
  approved_by: number | null;
  archived_at: Date | null;
  cancelled_at: Date | null;
  completed_at: Date | null;
  created_at: Date;
  created_by: number;
  created_by_name: string;
  currency: string;
  customer_id: number;
  customer_name: string;
  due_date: Date | null;
  gst_number: string | null;
  id: number;
  items: unknown | null;
  notes: string | null;
  order_date: Date;
  payment_net_days: number | null;
  payment_terms: string | null;
  scheduled_ship_date: Date | null;
  shipped_at: Date | null;
  shipping_address: string;
  shipping_address_id: number | null;
  shipping_label: string;
  status: string | null;
  updated_at: Date;
}

/** 'GetCustomerOrder' query type */
export interface IGetCustomerOrderQuery {
  params: IGetCustomerOrderParams;
  result: IGetCustomerOrderResult;
}

const getCustomerOrderIR: any = {"usedParamSet":{"id":true},"params":[{"name":"id","required":true,"transform":{"type":"scalar"},"locs":[{"a":1569,"b":1572}]}],"statement":"SELECT o.id, o.customer_id, o.shipping_address_id,\n       o.status::text AS status, o.currency,\n       o.payment_terms::text AS payment_terms, o.payment_net_days,\n       o.order_date, o.scheduled_ship_date, o.due_date, o.notes,\n       o.created_by, o.approved_by, o.approved_at,\n       o.shipped_at, o.completed_at, o.cancelled_at,\n       o.archived_at, o.created_at, o.updated_at,\n       c.name AS customer_name, c.gst_number,\n       u.username AS created_by_name,\n       sa.label AS shipping_label, sa.address AS shipping_address,\n       COALESCE((\n           SELECT jsonb_agg(jsonb_build_object(\n               'id',                        i.id,\n               'variant_id',                i.variant_id,\n               'paint_name',                p.name,\n               'classification',            v.classification,\n               'ink_series',                v.ink_series,\n               'pack_size_kg',              i.pack_size_kg,\n               'quantity',                  i.quantity,\n               'negotiated_price_per_pack', i.negotiated_price_per_pack,\n               'cost_to_build_per_pack',    i.cost_to_build_per_pack\n           ) ORDER BY i.id)\n           FROM customer_order_items i\n           JOIN paint_variants v ON v.id = i.variant_id\n           JOIN paints p ON p.id = v.paint_id\n           WHERE i.order_id = o.id\n       ), '[]'::jsonb) AS items\n  FROM customer_orders o\n  JOIN customers c ON c.id = o.customer_id\n  JOIN users u ON u.id = o.created_by\n  LEFT JOIN customer_shipping_addresses sa ON sa.id = o.shipping_address_id\n WHERE o.id = :id!"};

/**
 * Query generated from SQL:
 * ```
 * SELECT o.id, o.customer_id, o.shipping_address_id,
 *        o.status::text AS status, o.currency,
 *        o.payment_terms::text AS payment_terms, o.payment_net_days,
 *        o.order_date, o.scheduled_ship_date, o.due_date, o.notes,
 *        o.created_by, o.approved_by, o.approved_at,
 *        o.shipped_at, o.completed_at, o.cancelled_at,
 *        o.archived_at, o.created_at, o.updated_at,
 *        c.name AS customer_name, c.gst_number,
 *        u.username AS created_by_name,
 *        sa.label AS shipping_label, sa.address AS shipping_address,
 *        COALESCE((
 *            SELECT jsonb_agg(jsonb_build_object(
 *                'id',                        i.id,
 *                'variant_id',                i.variant_id,
 *                'paint_name',                p.name,
 *                'classification',            v.classification,
 *                'ink_series',                v.ink_series,
 *                'pack_size_kg',              i.pack_size_kg,
 *                'quantity',                  i.quantity,
 *                'negotiated_price_per_pack', i.negotiated_price_per_pack,
 *                'cost_to_build_per_pack',    i.cost_to_build_per_pack
 *            ) ORDER BY i.id)
 *            FROM customer_order_items i
 *            JOIN paint_variants v ON v.id = i.variant_id
 *            JOIN paints p ON p.id = v.paint_id
 *            WHERE i.order_id = o.id
 *        ), '[]'::jsonb) AS items
 *   FROM customer_orders o
 *   JOIN customers c ON c.id = o.customer_id
 *   JOIN users u ON u.id = o.created_by
 *   LEFT JOIN customer_shipping_addresses sa ON sa.id = o.shipping_address_id
 *  WHERE o.id = :id!
 * ```
 */
export const getCustomerOrder = new PreparedQuery<IGetCustomerOrderParams,IGetCustomerOrderResult>(getCustomerOrderIR);


/** 'InsertCustomerOrder' parameters type */
export interface IInsertCustomerOrderParams {
  currency?: string | null | void;
  customer_id: number;
  due_date?: DateOrString | null | void;
  notes?: string | null | void;
  payment_net_days?: number | null | void;
  payment_terms?: payment_terms | null | void;
  scheduled_ship_date?: DateOrString | null | void;
  shipping_address_id?: number | null | void;
  user_id: number;
}

/** 'InsertCustomerOrder' return type */
export interface IInsertCustomerOrderResult {
  currency: string;
  id: number;
}

/** 'InsertCustomerOrder' query type */
export interface IInsertCustomerOrderQuery {
  params: IInsertCustomerOrderParams;
  result: IInsertCustomerOrderResult;
}

const insertCustomerOrderIR: any = {"usedParamSet":{"customer_id":true,"shipping_address_id":true,"currency":true,"payment_terms":true,"payment_net_days":true,"scheduled_ship_date":true,"due_date":true,"notes":true,"user_id":true},"params":[{"name":"customer_id","required":true,"transform":{"type":"scalar"},"locs":[{"a":181,"b":193},{"a":306,"b":318}]},{"name":"shipping_address_id","required":false,"transform":{"type":"scalar"},"locs":[{"a":196,"b":215}]},{"name":"currency","required":false,"transform":{"type":"scalar"},"locs":[{"a":244,"b":252}]},{"name":"payment_terms","required":false,"transform":{"type":"scalar"},"locs":[{"a":347,"b":360}]},{"name":"payment_net_days","required":false,"transform":{"type":"scalar"},"locs":[{"a":390,"b":406}]},{"name":"scheduled_ship_date","required":false,"transform":{"type":"scalar"},"locs":[{"a":417,"b":436}]},{"name":"due_date","required":false,"transform":{"type":"scalar"},"locs":[{"a":439,"b":447}]},{"name":"notes","required":false,"transform":{"type":"scalar"},"locs":[{"a":450,"b":455}]},{"name":"user_id","required":true,"transform":{"type":"scalar"},"locs":[{"a":458,"b":466}]}],"statement":"INSERT INTO customer_orders\n    (customer_id, shipping_address_id, status, currency, payment_terms, payment_net_days,\n     scheduled_ship_date, due_date, notes, created_by)\nVALUES (:customer_id!, :shipping_address_id, 'draft',\n        COALESCE(:currency, (SELECT default_currency FROM customers WHERE id = :customer_id!), 'INR'),\n        COALESCE(:payment_terms::payment_terms, 'prepaid'), :payment_net_days,\n        :scheduled_ship_date, :due_date, :notes, :user_id!)\nRETURNING id, currency"};

/**
 * Query generated from SQL:
 * ```
 * INSERT INTO customer_orders
 *     (customer_id, shipping_address_id, status, currency, payment_terms, payment_net_days,
 *      scheduled_ship_date, due_date, notes, created_by)
 * VALUES (:customer_id!, :shipping_address_id, 'draft',
 *         COALESCE(:currency, (SELECT default_currency FROM customers WHERE id = :customer_id!), 'INR'),
 *         COALESCE(:payment_terms::payment_terms, 'prepaid'), :payment_net_days,
 *         :scheduled_ship_date, :due_date, :notes, :user_id!)
 * RETURNING id, currency
 * ```
 */
export const insertCustomerOrder = new PreparedQuery<IInsertCustomerOrderParams,IInsertCustomerOrderResult>(insertCustomerOrderIR);


/** 'InsertCustomerOrderItem' parameters type */
export interface IInsertCustomerOrderItemParams {
  cost_to_build_per_pack?: NumberOrString | null | void;
  negotiated_price_per_pack: NumberOrString;
  order_id: number;
  pack_size_kg: NumberOrString;
  quantity: number;
  variant_id: number;
}

/** 'InsertCustomerOrderItem' return type */
export type IInsertCustomerOrderItemResult = void;

/** 'InsertCustomerOrderItem' query type */
export interface IInsertCustomerOrderItemQuery {
  params: IInsertCustomerOrderItemParams;
  result: IInsertCustomerOrderItemResult;
}

const insertCustomerOrderItemIR: any = {"usedParamSet":{"order_id":true,"variant_id":true,"pack_size_kg":true,"quantity":true,"negotiated_price_per_pack":true,"cost_to_build_per_pack":true},"params":[{"name":"order_id","required":true,"transform":{"type":"scalar"},"locs":[{"a":148,"b":157}]},{"name":"variant_id","required":true,"transform":{"type":"scalar"},"locs":[{"a":160,"b":171}]},{"name":"pack_size_kg","required":true,"transform":{"type":"scalar"},"locs":[{"a":174,"b":187}]},{"name":"quantity","required":true,"transform":{"type":"scalar"},"locs":[{"a":190,"b":199}]},{"name":"negotiated_price_per_pack","required":true,"transform":{"type":"scalar"},"locs":[{"a":202,"b":228}]},{"name":"cost_to_build_per_pack","required":false,"transform":{"type":"scalar"},"locs":[{"a":231,"b":253}]}],"statement":"INSERT INTO customer_order_items\n    (order_id, variant_id, pack_size_kg, quantity,\n     negotiated_price_per_pack, cost_to_build_per_pack)\nVALUES (:order_id!, :variant_id!, :pack_size_kg!, :quantity!, :negotiated_price_per_pack!, :cost_to_build_per_pack)"};

/**
 * Query generated from SQL:
 * ```
 * INSERT INTO customer_order_items
 *     (order_id, variant_id, pack_size_kg, quantity,
 *      negotiated_price_per_pack, cost_to_build_per_pack)
 * VALUES (:order_id!, :variant_id!, :pack_size_kg!, :quantity!, :negotiated_price_per_pack!, :cost_to_build_per_pack)
 * ```
 */
export const insertCustomerOrderItem = new PreparedQuery<IInsertCustomerOrderItemParams,IInsertCustomerOrderItemResult>(insertCustomerOrderItemIR);


/** 'GetCustomerOrderStatus' parameters type */
export interface IGetCustomerOrderStatusParams {
  id: number;
}

/** 'GetCustomerOrderStatus' return type */
export interface IGetCustomerOrderStatusResult {
  created_by: number;
  status: string | null;
}

/** 'GetCustomerOrderStatus' query type */
export interface IGetCustomerOrderStatusQuery {
  params: IGetCustomerOrderStatusParams;
  result: IGetCustomerOrderStatusResult;
}

const getCustomerOrderStatusIR: any = {"usedParamSet":{"id":true},"params":[{"name":"id","required":true,"transform":{"type":"scalar"},"locs":[{"a":74,"b":77}]}],"statement":"SELECT status::text AS status, created_by FROM customer_orders WHERE id = :id!"};

/**
 * Query generated from SQL:
 * ```
 * SELECT status::text AS status, created_by FROM customer_orders WHERE id = :id!
 * ```
 */
export const getCustomerOrderStatus = new PreparedQuery<IGetCustomerOrderStatusParams,IGetCustomerOrderStatusResult>(getCustomerOrderStatusIR);


/** 'PatchCustomerOrder' parameters type */
export interface IPatchCustomerOrderParams {
  clear_net_days?: boolean | null | void;
  clear_ship_date?: boolean | null | void;
  currency?: string | null | void;
  id: number;
  notes?: string | null | void;
  payment_net_days?: number | null | void;
  payment_terms?: payment_terms | null | void;
  scheduled_ship_date?: DateOrString | null | void;
  shipping_address_id?: number | null | void;
}

/** 'PatchCustomerOrder' return type */
export interface IPatchCustomerOrderResult {
  id: number;
}

/** 'PatchCustomerOrder' query type */
export interface IPatchCustomerOrderQuery {
  params: IPatchCustomerOrderParams;
  result: IPatchCustomerOrderResult;
}

const patchCustomerOrderIR: any = {"usedParamSet":{"shipping_address_id":true,"currency":true,"payment_terms":true,"clear_net_days":true,"payment_net_days":true,"clear_ship_date":true,"scheduled_ship_date":true,"notes":true,"id":true},"params":[{"name":"shipping_address_id","required":false,"transform":{"type":"scalar"},"locs":[{"a":61,"b":80}]},{"name":"currency","required":false,"transform":{"type":"scalar"},"locs":[{"a":143,"b":151}]},{"name":"payment_terms","required":false,"transform":{"type":"scalar"},"locs":[{"a":203,"b":216}]},{"name":"clear_net_days","required":false,"transform":{"type":"scalar"},"locs":[{"a":289,"b":303}]},{"name":"payment_net_days","required":false,"transform":{"type":"scalar"},"locs":[{"a":335,"b":351}]},{"name":"clear_ship_date","required":false,"transform":{"type":"scalar"},"locs":[{"a":416,"b":431}]},{"name":"scheduled_ship_date","required":false,"transform":{"type":"scalar"},"locs":[{"a":463,"b":482}]},{"name":"notes","required":false,"transform":{"type":"scalar"},"locs":[{"a":549,"b":554}]},{"name":"id","required":true,"transform":{"type":"scalar"},"locs":[{"a":624,"b":627}]}],"statement":"UPDATE customer_orders\n   SET shipping_address_id = COALESCE(:shipping_address_id, shipping_address_id),\n       currency            = COALESCE(:currency, currency),\n       payment_terms       = COALESCE(:payment_terms::payment_terms, payment_terms),\n       payment_net_days    = CASE WHEN :clear_net_days::bool THEN NULL ELSE COALESCE(:payment_net_days, payment_net_days) END,\n       scheduled_ship_date = CASE WHEN :clear_ship_date::bool THEN NULL ELSE COALESCE(:scheduled_ship_date, scheduled_ship_date) END,\n       notes               = COALESCE(:notes, notes),\n       updated_at          = CURRENT_TIMESTAMP\n WHERE id = :id!\n RETURNING id"};

/**
 * Query generated from SQL:
 * ```
 * UPDATE customer_orders
 *    SET shipping_address_id = COALESCE(:shipping_address_id, shipping_address_id),
 *        currency            = COALESCE(:currency, currency),
 *        payment_terms       = COALESCE(:payment_terms::payment_terms, payment_terms),
 *        payment_net_days    = CASE WHEN :clear_net_days::bool THEN NULL ELSE COALESCE(:payment_net_days, payment_net_days) END,
 *        scheduled_ship_date = CASE WHEN :clear_ship_date::bool THEN NULL ELSE COALESCE(:scheduled_ship_date, scheduled_ship_date) END,
 *        notes               = COALESCE(:notes, notes),
 *        updated_at          = CURRENT_TIMESTAMP
 *  WHERE id = :id!
 *  RETURNING id
 * ```
 */
export const patchCustomerOrder = new PreparedQuery<IPatchCustomerOrderParams,IPatchCustomerOrderResult>(patchCustomerOrderIR);


/** 'SubmitCustomerOrder' parameters type */
export interface ISubmitCustomerOrderParams {
  id: number;
}

/** 'SubmitCustomerOrder' return type */
export interface ISubmitCustomerOrderResult {
  id: number;
}

/** 'SubmitCustomerOrder' query type */
export interface ISubmitCustomerOrderQuery {
  params: ISubmitCustomerOrderParams;
  result: ISubmitCustomerOrderResult;
}

const submitCustomerOrderIR: any = {"usedParamSet":{"id":true},"params":[{"name":"id","required":true,"transform":{"type":"scalar"},"locs":[{"a":99,"b":102}]}],"statement":"UPDATE customer_orders SET status = 'pending_approval', updated_at = CURRENT_TIMESTAMP\n WHERE id = :id! AND status = 'draft' RETURNING id"};

/**
 * Query generated from SQL:
 * ```
 * UPDATE customer_orders SET status = 'pending_approval', updated_at = CURRENT_TIMESTAMP
 *  WHERE id = :id! AND status = 'draft' RETURNING id
 * ```
 */
export const submitCustomerOrder = new PreparedQuery<ISubmitCustomerOrderParams,ISubmitCustomerOrderResult>(submitCustomerOrderIR);


/** 'ApproveCustomerOrder' parameters type */
export interface IApproveCustomerOrderParams {
  id: number;
  user_id: number;
}

/** 'ApproveCustomerOrder' return type */
export interface IApproveCustomerOrderResult {
  id: number;
}

/** 'ApproveCustomerOrder' query type */
export interface IApproveCustomerOrderQuery {
  params: IApproveCustomerOrderParams;
  result: IApproveCustomerOrderResult;
}

const approveCustomerOrderIR: any = {"usedParamSet":{"user_id":true,"id":true},"params":[{"name":"user_id","required":true,"transform":{"type":"scalar"},"locs":[{"a":65,"b":73}]},{"name":"id","required":true,"transform":{"type":"scalar"},"locs":[{"a":152,"b":155}]}],"statement":"UPDATE customer_orders\n   SET status = 'approved', approved_by = :user_id!, approved_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP\n WHERE id = :id! AND status = 'pending_approval'\n RETURNING id"};

/**
 * Query generated from SQL:
 * ```
 * UPDATE customer_orders
 *    SET status = 'approved', approved_by = :user_id!, approved_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
 *  WHERE id = :id! AND status = 'pending_approval'
 *  RETURNING id
 * ```
 */
export const approveCustomerOrder = new PreparedQuery<IApproveCustomerOrderParams,IApproveCustomerOrderResult>(approveCustomerOrderIR);


/** 'CancelCustomerOrder' parameters type */
export interface ICancelCustomerOrderParams {
  id: number;
}

/** 'CancelCustomerOrder' return type */
export interface ICancelCustomerOrderResult {
  id: number;
}

/** 'CancelCustomerOrder' query type */
export interface ICancelCustomerOrderQuery {
  params: ICancelCustomerOrderParams;
  result: ICancelCustomerOrderResult;
}

const cancelCustomerOrderIR: any = {"usedParamSet":{"id":true},"params":[{"name":"id","required":true,"transform":{"type":"scalar"},"locs":[{"a":126,"b":129}]}],"statement":"UPDATE customer_orders SET status = 'cancelled', cancelled_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP\n WHERE id = :id! RETURNING id"};

/**
 * Query generated from SQL:
 * ```
 * UPDATE customer_orders SET status = 'cancelled', cancelled_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
 *  WHERE id = :id! RETURNING id
 * ```
 */
export const cancelCustomerOrder = new PreparedQuery<ICancelCustomerOrderParams,ICancelCustomerOrderResult>(cancelCustomerOrderIR);


/** 'GetOrderForConfirmation' parameters type */
export interface IGetOrderForConfirmationParams {
  id: number;
}

/** 'GetOrderForConfirmation' return type */
export interface IGetOrderForConfirmationResult {
  contact_email: string | null;
  currency: string;
  customer_id: number;
  customer_name: string;
  due_date: Date | null;
  gst_number: string | null;
  id: number;
  payment_net_days: number | null;
  payment_terms: string | null;
  scheduled_ship_date: Date | null;
  shipping_address: string;
  shipping_address_id: number | null;
  shipping_label: string;
}

/** 'GetOrderForConfirmation' query type */
export interface IGetOrderForConfirmationQuery {
  params: IGetOrderForConfirmationParams;
  result: IGetOrderForConfirmationResult;
}

const getOrderForConfirmationIR: any = {"usedParamSet":{"id":true},"params":[{"name":"id","required":true,"transform":{"type":"scalar"},"locs":[{"a":459,"b":462}]}],"statement":"SELECT o.id, o.customer_id, o.shipping_address_id, o.currency,\n       o.payment_terms::text AS payment_terms, o.payment_net_days,\n       o.scheduled_ship_date, o.due_date,\n       c.name AS customer_name, c.gst_number, c.contact_email,\n       sa.label AS shipping_label, sa.address AS shipping_address\n  FROM customer_orders o\n  JOIN customers c ON c.id = o.customer_id\n  LEFT JOIN customer_shipping_addresses sa ON sa.id = o.shipping_address_id\n WHERE o.id = :id!"};

/**
 * Query generated from SQL:
 * ```
 * SELECT o.id, o.customer_id, o.shipping_address_id, o.currency,
 *        o.payment_terms::text AS payment_terms, o.payment_net_days,
 *        o.scheduled_ship_date, o.due_date,
 *        c.name AS customer_name, c.gst_number, c.contact_email,
 *        sa.label AS shipping_label, sa.address AS shipping_address
 *   FROM customer_orders o
 *   JOIN customers c ON c.id = o.customer_id
 *   LEFT JOIN customer_shipping_addresses sa ON sa.id = o.shipping_address_id
 *  WHERE o.id = :id!
 * ```
 */
export const getOrderForConfirmation = new PreparedQuery<IGetOrderForConfirmationParams,IGetOrderForConfirmationResult>(getOrderForConfirmationIR);


/** 'GetOrderItemsForConfirmation' parameters type */
export interface IGetOrderItemsForConfirmationParams {
  order_id: number;
}

/** 'GetOrderItemsForConfirmation' return type */
export interface IGetOrderItemsForConfirmationResult {
  classification: paint_classification;
  hsn_code: string | null;
  id: number;
  ink_series: ink_series;
  negotiated_price_per_pack: string;
  pack_size_kg: string;
  paint_name: string;
  product_code: string | null;
  quantity: number;
  variant_id: number;
}

/** 'GetOrderItemsForConfirmation' query type */
export interface IGetOrderItemsForConfirmationQuery {
  params: IGetOrderItemsForConfirmationParams;
  result: IGetOrderItemsForConfirmationResult;
}

const getOrderItemsForConfirmationIR: any = {"usedParamSet":{"order_id":true},"params":[{"name":"order_id","required":true,"transform":{"type":"scalar"},"locs":[{"a":306,"b":315}]}],"statement":"SELECT i.id, i.variant_id, i.pack_size_kg, i.quantity, i.negotiated_price_per_pack,\n       p.name AS paint_name, v.classification, v.ink_series, p.hsn_code, p.product_code\n  FROM customer_order_items i\n  JOIN paint_variants v ON v.id = i.variant_id\n  JOIN paints p ON p.id = v.paint_id\n WHERE i.order_id = :order_id!\n ORDER BY i.id"};

/**
 * Query generated from SQL:
 * ```
 * SELECT i.id, i.variant_id, i.pack_size_kg, i.quantity, i.negotiated_price_per_pack,
 *        p.name AS paint_name, v.classification, v.ink_series, p.hsn_code, p.product_code
 *   FROM customer_order_items i
 *   JOIN paint_variants v ON v.id = i.variant_id
 *   JOIN paints p ON p.id = v.paint_id
 *  WHERE i.order_id = :order_id!
 *  ORDER BY i.id
 * ```
 */
export const getOrderItemsForConfirmation = new PreparedQuery<IGetOrderItemsForConfirmationParams,IGetOrderItemsForConfirmationResult>(getOrderItemsForConfirmationIR);


/** 'NextConfirmationVersion' parameters type */
export interface INextConfirmationVersionParams {
  order_id: number;
}

/** 'NextConfirmationVersion' return type */
export interface INextConfirmationVersionResult {
  max: number | null;
}

/** 'NextConfirmationVersion' query type */
export interface INextConfirmationVersionQuery {
  params: INextConfirmationVersionParams;
  result: INextConfirmationVersionResult;
}

const nextConfirmationVersionIR: any = {"usedParamSet":{"order_id":true},"params":[{"name":"order_id","required":true,"transform":{"type":"scalar"},"locs":[{"a":82,"b":91}]}],"statement":"SELECT COALESCE(MAX(version), 0) AS max FROM order_confirmations WHERE order_id = :order_id!"};

/**
 * Query generated from SQL:
 * ```
 * SELECT COALESCE(MAX(version), 0) AS max FROM order_confirmations WHERE order_id = :order_id!
 * ```
 */
export const nextConfirmationVersion = new PreparedQuery<INextConfirmationVersionParams,INextConfirmationVersionResult>(nextConfirmationVersionIR);


/** 'InsertOrderConfirmation' parameters type */
export interface IInsertOrderConfirmationParams {
  order_id: number;
  payload: unknown;
  user_id: number;
  version: number;
}

/** 'InsertOrderConfirmation' return type */
export interface IInsertOrderConfirmationResult {
  created_at: Date;
  id: number;
  version: number;
}

/** 'InsertOrderConfirmation' query type */
export interface IInsertOrderConfirmationQuery {
  params: IInsertOrderConfirmationParams;
  result: IInsertOrderConfirmationResult;
}

const insertOrderConfirmationIR: any = {"usedParamSet":{"order_id":true,"version":true,"payload":true,"user_id":true},"params":[{"name":"order_id","required":true,"transform":{"type":"scalar"},"locs":[{"a":83,"b":92}]},{"name":"version","required":true,"transform":{"type":"scalar"},"locs":[{"a":95,"b":103}]},{"name":"payload","required":true,"transform":{"type":"scalar"},"locs":[{"a":106,"b":114}]},{"name":"user_id","required":true,"transform":{"type":"scalar"},"locs":[{"a":124,"b":132}]}],"statement":"INSERT INTO order_confirmations (order_id, version, payload, generated_by)\nVALUES (:order_id!, :version!, :payload!::jsonb, :user_id!)\nRETURNING id, version, created_at"};

/**
 * Query generated from SQL:
 * ```
 * INSERT INTO order_confirmations (order_id, version, payload, generated_by)
 * VALUES (:order_id!, :version!, :payload!::jsonb, :user_id!)
 * RETURNING id, version, created_at
 * ```
 */
export const insertOrderConfirmation = new PreparedQuery<IInsertOrderConfirmationParams,IInsertOrderConfirmationResult>(insertOrderConfirmationIR);


/** 'ListOrderItemsForCost' parameters type */
export interface IListOrderItemsForCostParams {
  order_id: number;
}

/** 'ListOrderItemsForCost' return type */
export interface IListOrderItemsForCostResult {
  id: number;
  pack_size_kg: string;
  quantity: number;
  variant_id: number;
}

/** 'ListOrderItemsForCost' query type */
export interface IListOrderItemsForCostQuery {
  params: IListOrderItemsForCostParams;
  result: IListOrderItemsForCostResult;
}

const listOrderItemsForCostIR: any = {"usedParamSet":{"order_id":true},"params":[{"name":"order_id","required":true,"transform":{"type":"scalar"},"locs":[{"a":89,"b":98}]}],"statement":"SELECT id, variant_id, pack_size_kg, quantity FROM customer_order_items WHERE order_id = :order_id!"};

/**
 * Query generated from SQL:
 * ```
 * SELECT id, variant_id, pack_size_kg, quantity FROM customer_order_items WHERE order_id = :order_id!
 * ```
 */
export const listOrderItemsForCost = new PreparedQuery<IListOrderItemsForCostParams,IListOrderItemsForCostResult>(listOrderItemsForCostIR);


/** 'VariantCostBaseline' parameters type */
export interface IVariantCostBaselineParams {
  variant_id: number;
}

/** 'VariantCostBaseline' return type */
export interface IVariantCostBaselineResult {
  standard_output_kg: string;
  total_cost: string | null;
}

/** 'VariantCostBaseline' query type */
export interface IVariantCostBaselineQuery {
  params: IVariantCostBaselineParams;
  result: IVariantCostBaselineResult;
}

const variantCostBaselineIR: any = {"usedParamSet":{"variant_id":true},"params":[{"name":"variant_id","required":true,"transform":{"type":"scalar"},"locs":[{"a":258,"b":269}]}],"statement":"SELECT f.standard_output_kg,\n       COALESCE(SUM(fr.quantity_kg * r.weighted_avg_cost_per_kg), 0) AS total_cost\n  FROM formulas f\n  LEFT JOIN formula_resources fr ON fr.formula_id = f.id\n  LEFT JOIN resources r ON r.id = fr.resource_id\n WHERE f.variant_id = :variant_id! AND f.archived_at IS NULL\n GROUP BY f.id, f.standard_output_kg\n ORDER BY f.is_default DESC, f.created_at DESC\n LIMIT 1"};

/**
 * Query generated from SQL:
 * ```
 * SELECT f.standard_output_kg,
 *        COALESCE(SUM(fr.quantity_kg * r.weighted_avg_cost_per_kg), 0) AS total_cost
 *   FROM formulas f
 *   LEFT JOIN formula_resources fr ON fr.formula_id = f.id
 *   LEFT JOIN resources r ON r.id = fr.resource_id
 *  WHERE f.variant_id = :variant_id! AND f.archived_at IS NULL
 *  GROUP BY f.id, f.standard_output_kg
 *  ORDER BY f.is_default DESC, f.created_at DESC
 *  LIMIT 1
 * ```
 */
export const variantCostBaseline = new PreparedQuery<IVariantCostBaselineParams,IVariantCostBaselineResult>(variantCostBaselineIR);


/** 'LockCustomerOrderForSale' parameters type */
export interface ILockCustomerOrderForSaleParams {
  id: number;
}

/** 'LockCustomerOrderForSale' return type */
export interface ILockCustomerOrderForSaleResult {
  created_by: number;
  currency: string;
  customer_id: number;
  due_date: Date | null;
  id: number;
  status: string | null;
}

/** 'LockCustomerOrderForSale' query type */
export interface ILockCustomerOrderForSaleQuery {
  params: ILockCustomerOrderForSaleParams;
  result: ILockCustomerOrderForSaleResult;
}

const lockCustomerOrderForSaleIR: any = {"usedParamSet":{"id":true},"params":[{"name":"id","required":true,"transform":{"type":"scalar"},"locs":[{"a":113,"b":116}]}],"statement":"SELECT id, customer_id, currency, due_date, status::text AS status, created_by\n  FROM customer_orders WHERE id = :id! FOR UPDATE"};

/**
 * Query generated from SQL:
 * ```
 * SELECT id, customer_id, currency, due_date, status::text AS status, created_by
 *   FROM customer_orders WHERE id = :id! FOR UPDATE
 * ```
 */
export const lockCustomerOrderForSale = new PreparedQuery<ILockCustomerOrderForSaleParams,ILockCustomerOrderForSaleResult>(lockCustomerOrderForSaleIR);


/** 'InsertSale' parameters type */
export interface IInsertSaleParams {
  currency: string;
  customer_id: number;
  due_date?: DateOrString | null | void;
  notes?: string | null | void;
  order_id: number;
  user_id: number;
}

/** 'InsertSale' return type */
export interface IInsertSaleResult {
  id: number;
}

/** 'InsertSale' query type */
export interface IInsertSaleQuery {
  params: IInsertSaleParams;
  result: IInsertSaleResult;
}

const insertSaleIR: any = {"usedParamSet":{"order_id":true,"customer_id":true,"currency":true,"due_date":true,"notes":true,"user_id":true},"params":[{"name":"order_id","required":true,"transform":{"type":"scalar"},"locs":[{"a":89,"b":98}]},{"name":"customer_id","required":true,"transform":{"type":"scalar"},"locs":[{"a":101,"b":113}]},{"name":"currency","required":true,"transform":{"type":"scalar"},"locs":[{"a":116,"b":125}]},{"name":"due_date","required":false,"transform":{"type":"scalar"},"locs":[{"a":128,"b":136}]},{"name":"notes","required":false,"transform":{"type":"scalar"},"locs":[{"a":139,"b":144}]},{"name":"user_id","required":true,"transform":{"type":"scalar"},"locs":[{"a":147,"b":155}]}],"statement":"INSERT INTO sales (order_id, customer_id, currency, due_date, notes, created_by)\nVALUES (:order_id!, :customer_id!, :currency!, :due_date, :notes, :user_id!)\nRETURNING id"};

/**
 * Query generated from SQL:
 * ```
 * INSERT INTO sales (order_id, customer_id, currency, due_date, notes, created_by)
 * VALUES (:order_id!, :customer_id!, :currency!, :due_date, :notes, :user_id!)
 * RETURNING id
 * ```
 */
export const insertSale = new PreparedQuery<IInsertSaleParams,IInsertSaleResult>(insertSaleIR);


/** 'GetOrderItemForSale' parameters type */
export interface IGetOrderItemForSaleParams {
  id: number;
  order_id: number;
}

/** 'GetOrderItemForSale' return type */
export interface IGetOrderItemForSaleResult {
  cost_to_build_per_pack: string | null;
  negotiated_price_per_pack: string;
  pack_size_kg: string;
  variant_id: number;
}

/** 'GetOrderItemForSale' query type */
export interface IGetOrderItemForSaleQuery {
  params: IGetOrderItemForSaleParams;
  result: IGetOrderItemForSaleResult;
}

const getOrderItemForSaleIR: any = {"usedParamSet":{"id":true,"order_id":true},"params":[{"name":"id","required":true,"transform":{"type":"scalar"},"locs":[{"a":122,"b":125}]},{"name":"order_id","required":true,"transform":{"type":"scalar"},"locs":[{"a":142,"b":151}]}],"statement":"SELECT negotiated_price_per_pack, cost_to_build_per_pack, variant_id, pack_size_kg\n  FROM customer_order_items WHERE id = :id! AND order_id = :order_id!"};

/**
 * Query generated from SQL:
 * ```
 * SELECT negotiated_price_per_pack, cost_to_build_per_pack, variant_id, pack_size_kg
 *   FROM customer_order_items WHERE id = :id! AND order_id = :order_id!
 * ```
 */
export const getOrderItemForSale = new PreparedQuery<IGetOrderItemForSaleParams,IGetOrderItemForSaleResult>(getOrderItemForSaleIR);


/** 'InsertSaleItem' parameters type */
export interface IInsertSaleItemParams {
  cost_per_pack?: NumberOrString | null | void;
  order_item_id: number;
  pack_size_kg: NumberOrString;
  price_per_pack: NumberOrString;
  quantity: number;
  sale_id: number;
  variant_id: number;
}

/** 'InsertSaleItem' return type */
export interface IInsertSaleItemResult {
  id: number;
}

/** 'InsertSaleItem' query type */
export interface IInsertSaleItemQuery {
  params: IInsertSaleItemParams;
  result: IInsertSaleItemResult;
}

const insertSaleItemIR: any = {"usedParamSet":{"sale_id":true,"order_item_id":true,"variant_id":true,"pack_size_kg":true,"quantity":true,"price_per_pack":true,"cost_per_pack":true},"params":[{"name":"sale_id","required":true,"transform":{"type":"scalar"},"locs":[{"a":127,"b":135}]},{"name":"order_item_id","required":true,"transform":{"type":"scalar"},"locs":[{"a":138,"b":152}]},{"name":"variant_id","required":true,"transform":{"type":"scalar"},"locs":[{"a":155,"b":166}]},{"name":"pack_size_kg","required":true,"transform":{"type":"scalar"},"locs":[{"a":169,"b":182}]},{"name":"quantity","required":true,"transform":{"type":"scalar"},"locs":[{"a":185,"b":194}]},{"name":"price_per_pack","required":true,"transform":{"type":"scalar"},"locs":[{"a":197,"b":212}]},{"name":"cost_per_pack","required":false,"transform":{"type":"scalar"},"locs":[{"a":215,"b":228}]}],"statement":"INSERT INTO sale_items\n    (sale_id, order_item_id, variant_id, pack_size_kg, quantity, price_per_pack, cost_per_pack)\nVALUES (:sale_id!, :order_item_id!, :variant_id!, :pack_size_kg!, :quantity!, :price_per_pack!, :cost_per_pack)\nRETURNING id"};

/**
 * Query generated from SQL:
 * ```
 * INSERT INTO sale_items
 *     (sale_id, order_item_id, variant_id, pack_size_kg, quantity, price_per_pack, cost_per_pack)
 * VALUES (:sale_id!, :order_item_id!, :variant_id!, :pack_size_kg!, :quantity!, :price_per_pack!, :cost_per_pack)
 * RETURNING id
 * ```
 */
export const insertSaleItem = new PreparedQuery<IInsertSaleItemParams,IInsertSaleItemResult>(insertSaleItemIR);


/** 'ClaimPackForSale' parameters type */
export interface IClaimPackForSaleParams {
  pack_id: NumberOrString;
  pack_size_kg: NumberOrString;
  variant_id: number;
}

/** 'ClaimPackForSale' return type */
export interface IClaimPackForSaleResult {
  id: string;
}

/** 'ClaimPackForSale' query type */
export interface IClaimPackForSaleQuery {
  params: IClaimPackForSaleParams;
  result: IClaimPackForSaleResult;
}

const claimPackForSaleIR: any = {"usedParamSet":{"pack_id":true,"variant_id":true,"pack_size_kg":true},"params":[{"name":"pack_id","required":true,"transform":{"type":"scalar"},"locs":[{"a":95,"b":103}]},{"name":"variant_id","required":true,"transform":{"type":"scalar"},"locs":[{"a":122,"b":133}]},{"name":"pack_size_kg","required":true,"transform":{"type":"scalar"},"locs":[{"a":154,"b":167}]}],"statement":"UPDATE finished_paint_packs\n   SET status = 'sold', updated_at = CURRENT_TIMESTAMP\n WHERE id = :pack_id! AND variant_id = :variant_id! AND pack_size_kg = :pack_size_kg!\n   AND status IN ('in_stock', 'ready_for_shipment', 'shipped')\n RETURNING id"};

/**
 * Query generated from SQL:
 * ```
 * UPDATE finished_paint_packs
 *    SET status = 'sold', updated_at = CURRENT_TIMESTAMP
 *  WHERE id = :pack_id! AND variant_id = :variant_id! AND pack_size_kg = :pack_size_kg!
 *    AND status IN ('in_stock', 'ready_for_shipment', 'shipped')
 *  RETURNING id
 * ```
 */
export const claimPackForSale = new PreparedQuery<IClaimPackForSaleParams,IClaimPackForSaleResult>(claimPackForSaleIR);


/** 'LinkPackToSaleItem' parameters type */
export interface ILinkPackToSaleItemParams {
  pack_id: NumberOrString;
  sale_item_id: number;
}

/** 'LinkPackToSaleItem' return type */
export type ILinkPackToSaleItemResult = void;

/** 'LinkPackToSaleItem' query type */
export interface ILinkPackToSaleItemQuery {
  params: ILinkPackToSaleItemParams;
  result: ILinkPackToSaleItemResult;
}

const linkPackToSaleItemIR: any = {"usedParamSet":{"sale_item_id":true,"pack_id":true},"params":[{"name":"sale_item_id","required":true,"transform":{"type":"scalar"},"locs":[{"a":60,"b":73}]},{"name":"pack_id","required":true,"transform":{"type":"scalar"},"locs":[{"a":76,"b":84}]}],"statement":"INSERT INTO sale_item_packs (sale_item_id, pack_id) VALUES (:sale_item_id!, :pack_id!)"};

/**
 * Query generated from SQL:
 * ```
 * INSERT INTO sale_item_packs (sale_item_id, pack_id) VALUES (:sale_item_id!, :pack_id!)
 * ```
 */
export const linkPackToSaleItem = new PreparedQuery<ILinkPackToSaleItemParams,ILinkPackToSaleItemResult>(linkPackToSaleItemIR);


/** 'ListSales' parameters type */
export interface IListSalesParams {
  owner_id?: number | null | void;
}

/** 'ListSales' return type */
export interface IListSalesResult {
  billed: string | null;
  collected: string | null;
  created_by: number;
  currency: string;
  customer_id: number;
  customer_name: string;
  due_date: Date | null;
  id: number;
  order_id: number;
  sale_date: Date;
}

/** 'ListSales' query type */
export interface IListSalesQuery {
  params: IListSalesParams;
  result: IListSalesResult;
}

const listSalesIR: any = {"usedParamSet":{"owner_id":true},"params":[{"name":"owner_id","required":false,"transform":{"type":"scalar"},"locs":[{"a":436,"b":444},{"a":477,"b":485}]}],"statement":"SELECT s.id, s.order_id, s.customer_id, c.name AS customer_name,\n       s.currency, s.sale_date, s.due_date, s.created_by,\n       (SELECT COALESCE(SUM(price_per_pack * quantity), 0) FROM sale_items WHERE sale_id = s.id) AS billed,\n       (SELECT COALESCE(SUM(amount), 0)                    FROM payments   WHERE sale_id = s.id) AS collected\n  FROM sales s\n  JOIN customers c ON c.id = s.customer_id\n WHERE s.archived_at IS NULL\n   AND (:owner_id::int IS NULL OR s.created_by = :owner_id)\n ORDER BY s.sale_date DESC\n LIMIT 200"};

/**
 * Query generated from SQL:
 * ```
 * SELECT s.id, s.order_id, s.customer_id, c.name AS customer_name,
 *        s.currency, s.sale_date, s.due_date, s.created_by,
 *        (SELECT COALESCE(SUM(price_per_pack * quantity), 0) FROM sale_items WHERE sale_id = s.id) AS billed,
 *        (SELECT COALESCE(SUM(amount), 0)                    FROM payments   WHERE sale_id = s.id) AS collected
 *   FROM sales s
 *   JOIN customers c ON c.id = s.customer_id
 *  WHERE s.archived_at IS NULL
 *    AND (:owner_id::int IS NULL OR s.created_by = :owner_id)
 *  ORDER BY s.sale_date DESC
 *  LIMIT 200
 * ```
 */
export const listSales = new PreparedQuery<IListSalesParams,IListSalesResult>(listSalesIR);


/** 'GetSale' parameters type */
export interface IGetSaleParams {
  id: number;
}

/** 'GetSale' return type */
export interface IGetSaleResult {
  billed: string | null;
  collected: string | null;
  created_at: Date;
  created_by: number;
  currency: string;
  customer_id: number;
  customer_name: string;
  due_date: Date | null;
  id: number;
  items: unknown | null;
  notes: string | null;
  order_id: number;
  payments: unknown | null;
  sale_date: Date;
  updated_at: Date;
}

/** 'GetSale' query type */
export interface IGetSaleQuery {
  params: IGetSaleParams;
  result: IGetSaleResult;
}

const getSaleIR: any = {"usedParamSet":{"id":true},"params":[{"name":"id","required":true,"transform":{"type":"scalar"},"locs":[{"a":1473,"b":1476}]}],"statement":"SELECT s.id, s.order_id, s.customer_id, s.currency, s.sale_date, s.due_date,\n       s.notes, s.created_by, s.created_at, s.updated_at,\n       c.name AS customer_name,\n       COALESCE((\n           SELECT jsonb_agg(jsonb_build_object(\n               'id', si.id, 'variant_id', si.variant_id, 'pack_size_kg', si.pack_size_kg,\n               'quantity', si.quantity, 'price_per_pack', si.price_per_pack,\n               'cost_per_pack', si.cost_per_pack,\n               'paint_name', p.name, 'classification', v.classification, 'ink_series', v.ink_series\n           ) ORDER BY si.id)\n           FROM sale_items si\n           JOIN paint_variants v ON v.id = si.variant_id\n           JOIN paints p ON p.id = v.paint_id\n           WHERE si.sale_id = s.id\n       ), '[]'::jsonb) AS items,\n       COALESCE((\n           SELECT jsonb_agg(jsonb_build_object(\n               'id', pay.id, 'amount', pay.amount, 'currency', pay.currency,\n               'date_received', pay.date_received, 'method', pay.method,\n               'reference_number', pay.reference_number\n           ) ORDER BY pay.date_received)\n           FROM payments pay WHERE pay.sale_id = s.id\n       ), '[]'::jsonb) AS payments,\n       (SELECT COALESCE(SUM(price_per_pack * quantity), 0) FROM sale_items WHERE sale_id = s.id) AS billed,\n       (SELECT COALESCE(SUM(amount), 0)                    FROM payments   WHERE sale_id = s.id) AS collected\n  FROM sales s\n  JOIN customers c ON c.id = s.customer_id\n WHERE s.id = :id!"};

/**
 * Query generated from SQL:
 * ```
 * SELECT s.id, s.order_id, s.customer_id, s.currency, s.sale_date, s.due_date,
 *        s.notes, s.created_by, s.created_at, s.updated_at,
 *        c.name AS customer_name,
 *        COALESCE((
 *            SELECT jsonb_agg(jsonb_build_object(
 *                'id', si.id, 'variant_id', si.variant_id, 'pack_size_kg', si.pack_size_kg,
 *                'quantity', si.quantity, 'price_per_pack', si.price_per_pack,
 *                'cost_per_pack', si.cost_per_pack,
 *                'paint_name', p.name, 'classification', v.classification, 'ink_series', v.ink_series
 *            ) ORDER BY si.id)
 *            FROM sale_items si
 *            JOIN paint_variants v ON v.id = si.variant_id
 *            JOIN paints p ON p.id = v.paint_id
 *            WHERE si.sale_id = s.id
 *        ), '[]'::jsonb) AS items,
 *        COALESCE((
 *            SELECT jsonb_agg(jsonb_build_object(
 *                'id', pay.id, 'amount', pay.amount, 'currency', pay.currency,
 *                'date_received', pay.date_received, 'method', pay.method,
 *                'reference_number', pay.reference_number
 *            ) ORDER BY pay.date_received)
 *            FROM payments pay WHERE pay.sale_id = s.id
 *        ), '[]'::jsonb) AS payments,
 *        (SELECT COALESCE(SUM(price_per_pack * quantity), 0) FROM sale_items WHERE sale_id = s.id) AS billed,
 *        (SELECT COALESCE(SUM(amount), 0)                    FROM payments   WHERE sale_id = s.id) AS collected
 *   FROM sales s
 *   JOIN customers c ON c.id = s.customer_id
 *  WHERE s.id = :id!
 * ```
 */
export const getSale = new PreparedQuery<IGetSaleParams,IGetSaleResult>(getSaleIR);


/** 'InsertPayment' parameters type */
export interface IInsertPaymentParams {
  amount: NumberOrString;
  attachment_url?: string | null | void;
  currency: string;
  date_received: DateOrString;
  method: payment_method;
  notes?: string | null | void;
  receiving_account?: string | null | void;
  reference_number?: string | null | void;
  sale_id: number;
  user_id: number;
}

/** 'InsertPayment' return type */
export interface IInsertPaymentResult {
  id: number;
}

/** 'InsertPayment' query type */
export interface IInsertPaymentQuery {
  params: IInsertPaymentParams;
  result: IInsertPaymentResult;
}

const insertPaymentIR: any = {"usedParamSet":{"sale_id":true,"amount":true,"currency":true,"date_received":true,"method":true,"reference_number":true,"receiving_account":true,"attachment_url":true,"notes":true,"user_id":true},"params":[{"name":"sale_id","required":true,"transform":{"type":"scalar"},"locs":[{"a":161,"b":169}]},{"name":"amount","required":true,"transform":{"type":"scalar"},"locs":[{"a":172,"b":179}]},{"name":"currency","required":true,"transform":{"type":"scalar"},"locs":[{"a":182,"b":191}]},{"name":"date_received","required":true,"transform":{"type":"scalar"},"locs":[{"a":194,"b":208}]},{"name":"method","required":true,"transform":{"type":"scalar"},"locs":[{"a":211,"b":218}]},{"name":"reference_number","required":false,"transform":{"type":"scalar"},"locs":[{"a":245,"b":261}]},{"name":"receiving_account","required":false,"transform":{"type":"scalar"},"locs":[{"a":264,"b":281}]},{"name":"attachment_url","required":false,"transform":{"type":"scalar"},"locs":[{"a":284,"b":298}]},{"name":"notes","required":false,"transform":{"type":"scalar"},"locs":[{"a":301,"b":306}]},{"name":"user_id","required":true,"transform":{"type":"scalar"},"locs":[{"a":309,"b":317}]}],"statement":"INSERT INTO payments\n    (sale_id, amount, currency, date_received, method, reference_number,\n     receiving_account, attachment_url, notes, created_by)\nVALUES (:sale_id!, :amount!, :currency!, :date_received!, :method!::payment_method,\n        :reference_number, :receiving_account, :attachment_url, :notes, :user_id!)\nRETURNING id"};

/**
 * Query generated from SQL:
 * ```
 * INSERT INTO payments
 *     (sale_id, amount, currency, date_received, method, reference_number,
 *      receiving_account, attachment_url, notes, created_by)
 * VALUES (:sale_id!, :amount!, :currency!, :date_received!, :method!::payment_method,
 *         :reference_number, :receiving_account, :attachment_url, :notes, :user_id!)
 * RETURNING id
 * ```
 */
export const insertPayment = new PreparedQuery<IInsertPaymentParams,IInsertPaymentResult>(insertPaymentIR);


/** 'GetSaleForReturn' parameters type */
export interface IGetSaleForReturnParams {
  id: number;
}

/** 'GetSaleForReturn' return type */
export interface IGetSaleForReturnResult {
  currency: string;
  customer_id: number;
}

/** 'GetSaleForReturn' query type */
export interface IGetSaleForReturnQuery {
  params: IGetSaleForReturnParams;
  result: IGetSaleForReturnResult;
}

const getSaleForReturnIR: any = {"usedParamSet":{"id":true},"params":[{"name":"id","required":true,"transform":{"type":"scalar"},"locs":[{"a":51,"b":54}]}],"statement":"SELECT customer_id, currency FROM sales WHERE id = :id!"};

/**
 * Query generated from SQL:
 * ```
 * SELECT customer_id, currency FROM sales WHERE id = :id!
 * ```
 */
export const getSaleForReturn = new PreparedQuery<IGetSaleForReturnParams,IGetSaleForReturnResult>(getSaleForReturnIR);


/** 'InsertReturn' parameters type */
export interface IInsertReturnParams {
  customer_id: number;
  notes?: string | null | void;
  sale_id: number;
  user_id: number;
}

/** 'InsertReturn' return type */
export interface IInsertReturnResult {
  id: number;
}

/** 'InsertReturn' query type */
export interface IInsertReturnQuery {
  params: IInsertReturnParams;
  result: IInsertReturnResult;
}

const insertReturnIR: any = {"usedParamSet":{"sale_id":true,"customer_id":true,"notes":true,"user_id":true},"params":[{"name":"sale_id","required":true,"transform":{"type":"scalar"},"locs":[{"a":72,"b":80}]},{"name":"customer_id","required":true,"transform":{"type":"scalar"},"locs":[{"a":83,"b":95}]},{"name":"notes","required":false,"transform":{"type":"scalar"},"locs":[{"a":98,"b":103}]},{"name":"user_id","required":true,"transform":{"type":"scalar"},"locs":[{"a":106,"b":114}]}],"statement":"INSERT INTO returns (sale_id, customer_id, notes, completed_by)\nVALUES (:sale_id!, :customer_id!, :notes, :user_id!)\nRETURNING id"};

/**
 * Query generated from SQL:
 * ```
 * INSERT INTO returns (sale_id, customer_id, notes, completed_by)
 * VALUES (:sale_id!, :customer_id!, :notes, :user_id!)
 * RETURNING id
 * ```
 */
export const insertReturn = new PreparedQuery<IInsertReturnParams,IInsertReturnResult>(insertReturnIR);


/** 'InsertReturnItem' parameters type */
export interface IInsertReturnItemParams {
  condition: return_condition;
  disposition: return_disposition;
  notes?: string | null | void;
  pack_id?: NumberOrString | null | void;
  return_id: number;
  sale_item_id: number;
}

/** 'InsertReturnItem' return type */
export type IInsertReturnItemResult = void;

/** 'InsertReturnItem' query type */
export interface IInsertReturnItemQuery {
  params: IInsertReturnItemParams;
  result: IInsertReturnItemResult;
}

const insertReturnItemIR: any = {"usedParamSet":{"return_id":true,"sale_item_id":true,"pack_id":true,"condition":true,"disposition":true,"notes":true},"params":[{"name":"return_id","required":true,"transform":{"type":"scalar"},"locs":[{"a":103,"b":113}]},{"name":"sale_item_id","required":true,"transform":{"type":"scalar"},"locs":[{"a":116,"b":129}]},{"name":"pack_id","required":false,"transform":{"type":"scalar"},"locs":[{"a":132,"b":139}]},{"name":"condition","required":true,"transform":{"type":"scalar"},"locs":[{"a":142,"b":152}]},{"name":"disposition","required":true,"transform":{"type":"scalar"},"locs":[{"a":173,"b":185}]},{"name":"notes","required":false,"transform":{"type":"scalar"},"locs":[{"a":208,"b":213}]}],"statement":"INSERT INTO return_items\n    (return_id, sale_item_id, pack_id, condition, disposition, notes)\nVALUES (:return_id!, :sale_item_id!, :pack_id, :condition!::return_condition, :disposition!::return_disposition, :notes)"};

/**
 * Query generated from SQL:
 * ```
 * INSERT INTO return_items
 *     (return_id, sale_item_id, pack_id, condition, disposition, notes)
 * VALUES (:return_id!, :sale_item_id!, :pack_id, :condition!::return_condition, :disposition!::return_disposition, :notes)
 * ```
 */
export const insertReturnItem = new PreparedQuery<IInsertReturnItemParams,IInsertReturnItemResult>(insertReturnItemIR);


/** 'SetPackReadyAfterReturn' parameters type */
export interface ISetPackReadyAfterReturnParams {
  pack_id: NumberOrString;
}

/** 'SetPackReadyAfterReturn' return type */
export type ISetPackReadyAfterReturnResult = void;

/** 'SetPackReadyAfterReturn' query type */
export interface ISetPackReadyAfterReturnQuery {
  params: ISetPackReadyAfterReturnParams;
  result: ISetPackReadyAfterReturnResult;
}

const setPackReadyAfterReturnIR: any = {"usedParamSet":{"pack_id":true},"params":[{"name":"pack_id","required":true,"transform":{"type":"scalar"},"locs":[{"a":105,"b":113}]}],"statement":"UPDATE finished_paint_packs SET status = 'ready_for_shipment', updated_at = CURRENT_TIMESTAMP WHERE id = :pack_id!"};

/**
 * Query generated from SQL:
 * ```
 * UPDATE finished_paint_packs SET status = 'ready_for_shipment', updated_at = CURRENT_TIMESTAMP WHERE id = :pack_id!
 * ```
 */
export const setPackReadyAfterReturn = new PreparedQuery<ISetPackReadyAfterReturnParams,ISetPackReadyAfterReturnResult>(setPackReadyAfterReturnIR);


/** 'SetPackLostAfterReturn' parameters type */
export interface ISetPackLostAfterReturnParams {
  pack_id: NumberOrString;
}

/** 'SetPackLostAfterReturn' return type */
export type ISetPackLostAfterReturnResult = void;

/** 'SetPackLostAfterReturn' query type */
export interface ISetPackLostAfterReturnQuery {
  params: ISetPackLostAfterReturnParams;
  result: ISetPackLostAfterReturnResult;
}

const setPackLostAfterReturnIR: any = {"usedParamSet":{"pack_id":true},"params":[{"name":"pack_id","required":true,"transform":{"type":"scalar"},"locs":[{"a":91,"b":99}]}],"statement":"UPDATE finished_paint_packs SET status = 'lost', updated_at = CURRENT_TIMESTAMP WHERE id = :pack_id!"};

/**
 * Query generated from SQL:
 * ```
 * UPDATE finished_paint_packs SET status = 'lost', updated_at = CURRENT_TIMESTAMP WHERE id = :pack_id!
 * ```
 */
export const setPackLostAfterReturn = new PreparedQuery<ISetPackLostAfterReturnParams,ISetPackLostAfterReturnResult>(setPackLostAfterReturnIR);


/** 'InsertRefund' parameters type */
export interface IInsertRefundParams {
  amount: NumberOrString;
  currency: string;
  return_id: number;
  user_id: number;
}

/** 'InsertRefund' return type */
export interface IInsertRefundResult {
  id: number;
}

/** 'InsertRefund' query type */
export interface IInsertRefundQuery {
  params: IInsertRefundParams;
  result: IInsertRefundResult;
}

const insertRefundIR: any = {"usedParamSet":{"return_id":true,"amount":true,"currency":true,"user_id":true},"params":[{"name":"return_id","required":true,"transform":{"type":"scalar"},"locs":[{"a":70,"b":80}]},{"name":"amount","required":true,"transform":{"type":"scalar"},"locs":[{"a":83,"b":90}]},{"name":"currency","required":true,"transform":{"type":"scalar"},"locs":[{"a":93,"b":102}]},{"name":"user_id","required":true,"transform":{"type":"scalar"},"locs":[{"a":105,"b":113}]}],"statement":"INSERT INTO refunds (return_id, amount, currency, created_by)\nVALUES (:return_id!, :amount!, :currency!, :user_id!)\nRETURNING id"};

/**
 * Query generated from SQL:
 * ```
 * INSERT INTO refunds (return_id, amount, currency, created_by)
 * VALUES (:return_id!, :amount!, :currency!, :user_id!)
 * RETURNING id
 * ```
 */
export const insertRefund = new PreparedQuery<IInsertRefundParams,IInsertRefundResult>(insertRefundIR);


/** 'ApproveRefund' parameters type */
export interface IApproveRefundParams {
  id: number;
  user_id: number;
}

/** 'ApproveRefund' return type */
export interface IApproveRefundResult {
  id: number;
}

/** 'ApproveRefund' query type */
export interface IApproveRefundQuery {
  params: IApproveRefundParams;
  result: IApproveRefundResult;
}

const approveRefundIR: any = {"usedParamSet":{"user_id":true,"id":true},"params":[{"name":"user_id","required":true,"transform":{"type":"scalar"},"locs":[{"a":57,"b":65}]},{"name":"id","required":true,"transform":{"type":"scalar"},"locs":[{"a":144,"b":147}]}],"statement":"UPDATE refunds\n   SET status = 'approved', approved_by = :user_id!, approved_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP\n WHERE id = :id! AND status = 'pending_approval'\n RETURNING id"};

/**
 * Query generated from SQL:
 * ```
 * UPDATE refunds
 *    SET status = 'approved', approved_by = :user_id!, approved_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
 *  WHERE id = :id! AND status = 'pending_approval'
 *  RETURNING id
 * ```
 */
export const approveRefund = new PreparedQuery<IApproveRefundParams,IApproveRefundResult>(approveRefundIR);


/** 'RejectRefund' parameters type */
export interface IRejectRefundParams {
  id: number;
  reason: string;
}

/** 'RejectRefund' return type */
export interface IRejectRefundResult {
  id: number;
}

/** 'RejectRefund' query type */
export interface IRejectRefundQuery {
  params: IRejectRefundParams;
  result: IRejectRefundResult;
}

const rejectRefundIR: any = {"usedParamSet":{"reason":true,"id":true},"params":[{"name":"reason","required":true,"transform":{"type":"scalar"},"locs":[{"a":61,"b":68}]},{"name":"id","required":true,"transform":{"type":"scalar"},"locs":[{"a":114,"b":117}]}],"statement":"UPDATE refunds\n   SET status = 'rejected', rejected_reason = :reason!, updated_at = CURRENT_TIMESTAMP\n WHERE id = :id! AND status = 'pending_approval'\n RETURNING id"};

/**
 * Query generated from SQL:
 * ```
 * UPDATE refunds
 *    SET status = 'rejected', rejected_reason = :reason!, updated_at = CURRENT_TIMESTAMP
 *  WHERE id = :id! AND status = 'pending_approval'
 *  RETURNING id
 * ```
 */
export const rejectRefund = new PreparedQuery<IRejectRefundParams,IRejectRefundResult>(rejectRefundIR);


/** 'LockRefundForPayout' parameters type */
export interface ILockRefundForPayoutParams {
  id: number;
}

/** 'LockRefundForPayout' return type */
export interface ILockRefundForPayoutResult {
  amount: string;
  currency: string;
  status: string | null;
}

/** 'LockRefundForPayout' query type */
export interface ILockRefundForPayoutQuery {
  params: ILockRefundForPayoutParams;
  result: ILockRefundForPayoutResult;
}

const lockRefundForPayoutIR: any = {"usedParamSet":{"id":true},"params":[{"name":"id","required":true,"transform":{"type":"scalar"},"locs":[{"a":72,"b":75}]}],"statement":"SELECT amount, currency, status::text AS status FROM refunds WHERE id = :id! FOR UPDATE"};

/**
 * Query generated from SQL:
 * ```
 * SELECT amount, currency, status::text AS status FROM refunds WHERE id = :id! FOR UPDATE
 * ```
 */
export const lockRefundForPayout = new PreparedQuery<ILockRefundForPayoutParams,ILockRefundForPayoutResult>(lockRefundForPayoutIR);


/** 'InsertRefundPayout' parameters type */
export interface IInsertRefundPayoutParams {
  amount: NumberOrString;
  attachment_url?: string | null | void;
  currency: string;
  date_paid: DateOrString;
  method: payment_method;
  notes?: string | null | void;
  paying_account?: string | null | void;
  reference_number?: string | null | void;
  refund_id: number;
  user_id: number;
}

/** 'InsertRefundPayout' return type */
export type IInsertRefundPayoutResult = void;

/** 'InsertRefundPayout' query type */
export interface IInsertRefundPayoutQuery {
  params: IInsertRefundPayoutParams;
  result: IInsertRefundPayoutResult;
}

const insertRefundPayoutIR: any = {"usedParamSet":{"refund_id":true,"amount":true,"currency":true,"date_paid":true,"method":true,"reference_number":true,"paying_account":true,"attachment_url":true,"notes":true,"user_id":true},"params":[{"name":"refund_id","required":true,"transform":{"type":"scalar"},"locs":[{"a":162,"b":172}]},{"name":"amount","required":true,"transform":{"type":"scalar"},"locs":[{"a":175,"b":182}]},{"name":"currency","required":true,"transform":{"type":"scalar"},"locs":[{"a":185,"b":194}]},{"name":"date_paid","required":true,"transform":{"type":"scalar"},"locs":[{"a":197,"b":207}]},{"name":"method","required":true,"transform":{"type":"scalar"},"locs":[{"a":210,"b":217}]},{"name":"reference_number","required":false,"transform":{"type":"scalar"},"locs":[{"a":244,"b":260}]},{"name":"paying_account","required":false,"transform":{"type":"scalar"},"locs":[{"a":263,"b":277}]},{"name":"attachment_url","required":false,"transform":{"type":"scalar"},"locs":[{"a":280,"b":294}]},{"name":"notes","required":false,"transform":{"type":"scalar"},"locs":[{"a":297,"b":302}]},{"name":"user_id","required":true,"transform":{"type":"scalar"},"locs":[{"a":305,"b":313}]}],"statement":"INSERT INTO refund_payouts\n    (refund_id, amount, currency, date_paid, method, reference_number,\n     paying_account, attachment_url, notes, created_by)\nVALUES (:refund_id!, :amount!, :currency!, :date_paid!, :method!::payment_method,\n        :reference_number, :paying_account, :attachment_url, :notes, :user_id!)"};

/**
 * Query generated from SQL:
 * ```
 * INSERT INTO refund_payouts
 *     (refund_id, amount, currency, date_paid, method, reference_number,
 *      paying_account, attachment_url, notes, created_by)
 * VALUES (:refund_id!, :amount!, :currency!, :date_paid!, :method!::payment_method,
 *         :reference_number, :paying_account, :attachment_url, :notes, :user_id!)
 * ```
 */
export const insertRefundPayout = new PreparedQuery<IInsertRefundPayoutParams,IInsertRefundPayoutResult>(insertRefundPayoutIR);


/** 'SumRefundPayouts' parameters type */
export interface ISumRefundPayoutsParams {
  refund_id: number;
}

/** 'SumRefundPayouts' return type */
export interface ISumRefundPayoutsResult {
  sum: string | null;
}

/** 'SumRefundPayouts' query type */
export interface ISumRefundPayoutsQuery {
  params: ISumRefundPayoutsParams;
  result: ISumRefundPayoutsResult;
}

const sumRefundPayoutsIR: any = {"usedParamSet":{"refund_id":true},"params":[{"name":"refund_id","required":true,"transform":{"type":"scalar"},"locs":[{"a":77,"b":87}]}],"statement":"SELECT COALESCE(SUM(amount), 0) AS sum FROM refund_payouts WHERE refund_id = :refund_id!"};

/**
 * Query generated from SQL:
 * ```
 * SELECT COALESCE(SUM(amount), 0) AS sum FROM refund_payouts WHERE refund_id = :refund_id!
 * ```
 */
export const sumRefundPayouts = new PreparedQuery<ISumRefundPayoutsParams,ISumRefundPayoutsResult>(sumRefundPayoutsIR);


/** 'MarkRefundPaidOut' parameters type */
export interface IMarkRefundPaidOutParams {
  id: number;
}

/** 'MarkRefundPaidOut' return type */
export type IMarkRefundPaidOutResult = void;

/** 'MarkRefundPaidOut' query type */
export interface IMarkRefundPaidOutQuery {
  params: IMarkRefundPaidOutParams;
  result: IMarkRefundPaidOutResult;
}

const markRefundPaidOutIR: any = {"usedParamSet":{"id":true},"params":[{"name":"id","required":true,"transform":{"type":"scalar"},"locs":[{"a":82,"b":85}]}],"statement":"UPDATE refunds SET status = 'paid_out', updated_at = CURRENT_TIMESTAMP WHERE id = :id!"};

/**
 * Query generated from SQL:
 * ```
 * UPDATE refunds SET status = 'paid_out', updated_at = CURRENT_TIMESTAMP WHERE id = :id!
 * ```
 */
export const markRefundPaidOut = new PreparedQuery<IMarkRefundPaidOutParams,IMarkRefundPaidOutResult>(markRefundPaidOutIR);


/** 'FinishedInventoryGrouped' parameters type */
export interface IFinishedInventoryGroupedParams {
  status?: pack_status | null | void;
  variant_id?: number | null | void;
}

/** 'FinishedInventoryGrouped' return type */
export interface IFinishedInventoryGroupedResult {
  avg_cost_per_kg: string | null;
  classification: paint_classification;
  ink_series: ink_series;
  pack_size_kg: string;
  paint_id: number;
  paint_name: string;
  status: string | null;
  total_kg: string | null;
  units: string | null;
  variant_id: number;
}

/** 'FinishedInventoryGrouped' query type */
export interface IFinishedInventoryGroupedQuery {
  params: IFinishedInventoryGroupedParams;
  result: IFinishedInventoryGroupedResult;
}

const finishedInventoryGroupedIR: any = {"usedParamSet":{"variant_id":true,"status":true},"params":[{"name":"variant_id","required":false,"transform":{"type":"scalar"},"locs":[{"a":476,"b":486},{"a":520,"b":530}]},{"name":"status","required":false,"transform":{"type":"scalar"},"locs":[{"a":541,"b":547},{"a":585,"b":591}]}],"statement":"SELECT fp.variant_id,\n       p.id   AS paint_id,\n       p.name AS paint_name,\n       v.classification, v.ink_series,\n       fp.pack_size_kg,\n       fp.status::text AS status,\n       COUNT(*)                              AS units,\n       SUM(fp.pack_size_kg)                  AS total_kg,\n       AVG(fp.cost_per_kg)                   AS avg_cost_per_kg\n  FROM finished_paint_packs fp\n  JOIN paint_variants v ON v.id = fp.variant_id\n  JOIN paints p ON p.id = v.paint_id\n WHERE (:variant_id::int IS NULL OR fp.variant_id = :variant_id)\n   AND (:status::pack_status IS NULL OR fp.status = :status)\n GROUP BY fp.variant_id, p.id, p.name, v.classification, v.ink_series,\n          fp.pack_size_kg, fp.status\n ORDER BY p.name, v.classification, v.ink_series, fp.pack_size_kg, fp.status"};

/**
 * Query generated from SQL:
 * ```
 * SELECT fp.variant_id,
 *        p.id   AS paint_id,
 *        p.name AS paint_name,
 *        v.classification, v.ink_series,
 *        fp.pack_size_kg,
 *        fp.status::text AS status,
 *        COUNT(*)                              AS units,
 *        SUM(fp.pack_size_kg)                  AS total_kg,
 *        AVG(fp.cost_per_kg)                   AS avg_cost_per_kg
 *   FROM finished_paint_packs fp
 *   JOIN paint_variants v ON v.id = fp.variant_id
 *   JOIN paints p ON p.id = v.paint_id
 *  WHERE (:variant_id::int IS NULL OR fp.variant_id = :variant_id)
 *    AND (:status::pack_status IS NULL OR fp.status = :status)
 *  GROUP BY fp.variant_id, p.id, p.name, v.classification, v.ink_series,
 *           fp.pack_size_kg, fp.status
 *  ORDER BY p.name, v.classification, v.ink_series, fp.pack_size_kg, fp.status
 * ```
 */
export const finishedInventoryGrouped = new PreparedQuery<IFinishedInventoryGroupedParams,IFinishedInventoryGroupedResult>(finishedInventoryGroupedIR);


/** 'FinishedPacksByVariant' parameters type */
export interface IFinishedPacksByVariantParams {
  variant_id: number;
}

/** 'FinishedPacksByVariant' return type */
export interface IFinishedPacksByVariantResult {
  cost_per_kg: string;
  created_at: Date;
  id: string;
  location: string | null;
  pack_size_kg: string;
  po_item_id: number | null;
  production_run_id: number | null;
  source: string | null;
  status: string | null;
}

/** 'FinishedPacksByVariant' query type */
export interface IFinishedPacksByVariantQuery {
  params: IFinishedPacksByVariantParams;
  result: IFinishedPacksByVariantResult;
}

const finishedPacksByVariantIR: any = {"usedParamSet":{"variant_id":true},"params":[{"name":"variant_id","required":true,"transform":{"type":"scalar"},"locs":[{"a":226,"b":237}]}],"statement":"SELECT fp.id, fp.pack_size_kg, fp.source::text AS source, fp.production_run_id, fp.po_item_id,\n       fp.cost_per_kg, fp.status::text AS status, fp.location, fp.created_at\n  FROM finished_paint_packs fp\n WHERE fp.variant_id = :variant_id!\n ORDER BY fp.created_at DESC\n LIMIT 500"};

/**
 * Query generated from SQL:
 * ```
 * SELECT fp.id, fp.pack_size_kg, fp.source::text AS source, fp.production_run_id, fp.po_item_id,
 *        fp.cost_per_kg, fp.status::text AS status, fp.location, fp.created_at
 *   FROM finished_paint_packs fp
 *  WHERE fp.variant_id = :variant_id!
 *  ORDER BY fp.created_at DESC
 *  LIMIT 500
 * ```
 */
export const finishedPacksByVariant = new PreparedQuery<IFinishedPacksByVariantParams,IFinishedPacksByVariantResult>(finishedPacksByVariantIR);


/** 'StashList' parameters type */
export type IStashListParams = void;

/** 'StashList' return type */
export interface IStashListResult {
  classification: paint_classification;
  ink_series: ink_series;
  kg_remaining: string;
  paint_name: string;
  updated_at: Date;
  variant_id: number;
}

/** 'StashList' query type */
export interface IStashListQuery {
  params: IStashListParams;
  result: IStashListResult;
}

const stashListIR: any = {"usedParamSet":{},"params":[],"statement":"SELECT s.variant_id, s.kg_remaining, s.updated_at,\n       p.name AS paint_name, v.classification, v.ink_series\n  FROM paint_variant_stash s\n  JOIN paint_variants v ON v.id = s.variant_id\n  JOIN paints p ON p.id = v.paint_id\n WHERE s.kg_remaining > 0\n ORDER BY p.name, v.classification, v.ink_series"};

/**
 * Query generated from SQL:
 * ```
 * SELECT s.variant_id, s.kg_remaining, s.updated_at,
 *        p.name AS paint_name, v.classification, v.ink_series
 *   FROM paint_variant_stash s
 *   JOIN paint_variants v ON v.id = s.variant_id
 *   JOIN paints p ON p.id = v.paint_id
 *  WHERE s.kg_remaining > 0
 *  ORDER BY p.name, v.classification, v.ink_series
 * ```
 */
export const stashList = new PreparedQuery<IStashListParams,IStashListResult>(stashListIR);


/** 'ResourceInventory' parameters type */
export type IResourceInventoryParams = void;

/** 'ResourceInventory' return type */
export interface IResourceInventoryResult {
  aliases: unknown;
  current_stock_kg: string;
  effective_threshold_kg: string | null;
  id: number;
  is_low_stock: boolean | null;
  low_stock_threshold_kg: string | null;
  name: string;
  weighted_avg_cost_per_kg: string;
}

/** 'ResourceInventory' query type */
export interface IResourceInventoryQuery {
  params: IResourceInventoryParams;
  result: IResourceInventoryResult;
}

const resourceInventoryIR: any = {"usedParamSet":{},"params":[],"statement":"SELECT r.id, r.name, r.aliases, r.current_stock_kg, r.weighted_avg_cost_per_kg,\n       r.low_stock_threshold_kg,\n       COALESCE(\n           r.low_stock_threshold_kg,\n           (SELECT NULLIF(value->>'kg','')::numeric FROM app_settings WHERE key = 'low_stock_threshold_kg'),\n           0\n       ) AS effective_threshold_kg,\n       r.current_stock_kg < COALESCE(\n           r.low_stock_threshold_kg,\n           (SELECT NULLIF(value->>'kg','')::numeric FROM app_settings WHERE key = 'low_stock_threshold_kg'),\n           0\n       ) AS is_low_stock\n  FROM resources r\n WHERE r.archived_at IS NULL\n ORDER BY r.name"};

/**
 * Query generated from SQL:
 * ```
 * SELECT r.id, r.name, r.aliases, r.current_stock_kg, r.weighted_avg_cost_per_kg,
 *        r.low_stock_threshold_kg,
 *        COALESCE(
 *            r.low_stock_threshold_kg,
 *            (SELECT NULLIF(value->>'kg','')::numeric FROM app_settings WHERE key = 'low_stock_threshold_kg'),
 *            0
 *        ) AS effective_threshold_kg,
 *        r.current_stock_kg < COALESCE(
 *            r.low_stock_threshold_kg,
 *            (SELECT NULLIF(value->>'kg','')::numeric FROM app_settings WHERE key = 'low_stock_threshold_kg'),
 *            0
 *        ) AS is_low_stock
 *   FROM resources r
 *  WHERE r.archived_at IS NULL
 *  ORDER BY r.name
 * ```
 */
export const resourceInventory = new PreparedQuery<IResourceInventoryParams,IResourceInventoryResult>(resourceInventoryIR);


/** 'DashboardCounts' parameters type */
export type IDashboardCountsParams = void;

/** 'DashboardCounts' return type */
export interface IDashboardCountsResult {
  customers: string | null;
  formulas: string | null;
  packs_in_stock: string | null;
  packs_ready_to_ship: string | null;
  paints: string | null;
  resources: string | null;
  suppliers: string | null;
  variants: string | null;
}

/** 'DashboardCounts' query type */
export interface IDashboardCountsQuery {
  params: IDashboardCountsParams;
  result: IDashboardCountsResult;
}

const dashboardCountsIR: any = {"usedParamSet":{},"params":[],"statement":"SELECT\n    (SELECT COUNT(*) FROM paints          WHERE archived_at IS NULL) AS paints,\n    (SELECT COUNT(*) FROM paint_variants  WHERE archived_at IS NULL) AS variants,\n    (SELECT COUNT(*) FROM formulas        WHERE archived_at IS NULL) AS formulas,\n    (SELECT COUNT(*) FROM resources       WHERE archived_at IS NULL) AS resources,\n    (SELECT COUNT(*) FROM customers       WHERE archived_at IS NULL) AS customers,\n    (SELECT COUNT(*) FROM suppliers       WHERE archived_at IS NULL) AS suppliers,\n    (SELECT COUNT(*) FROM finished_paint_packs WHERE status = 'in_stock')           AS packs_in_stock,\n    (SELECT COUNT(*) FROM finished_paint_packs WHERE status = 'ready_for_shipment') AS packs_ready_to_ship"};

/**
 * Query generated from SQL:
 * ```
 * SELECT
 *     (SELECT COUNT(*) FROM paints          WHERE archived_at IS NULL) AS paints,
 *     (SELECT COUNT(*) FROM paint_variants  WHERE archived_at IS NULL) AS variants,
 *     (SELECT COUNT(*) FROM formulas        WHERE archived_at IS NULL) AS formulas,
 *     (SELECT COUNT(*) FROM resources       WHERE archived_at IS NULL) AS resources,
 *     (SELECT COUNT(*) FROM customers       WHERE archived_at IS NULL) AS customers,
 *     (SELECT COUNT(*) FROM suppliers       WHERE archived_at IS NULL) AS suppliers,
 *     (SELECT COUNT(*) FROM finished_paint_packs WHERE status = 'in_stock')           AS packs_in_stock,
 *     (SELECT COUNT(*) FROM finished_paint_packs WHERE status = 'ready_for_shipment') AS packs_ready_to_ship
 * ```
 */
export const dashboardCounts = new PreparedQuery<IDashboardCountsParams,IDashboardCountsResult>(dashboardCountsIR);


/** 'DashboardLowStock' parameters type */
export type IDashboardLowStockParams = void;

/** 'DashboardLowStock' return type */
export interface IDashboardLowStockResult {
  current_stock_kg: string;
  effective_threshold_kg: string | null;
  id: number;
  name: string;
}

/** 'DashboardLowStock' query type */
export interface IDashboardLowStockQuery {
  params: IDashboardLowStockParams;
  result: IDashboardLowStockResult;
}

const dashboardLowStockIR: any = {"usedParamSet":{},"params":[],"statement":"SELECT r.id, r.name, r.current_stock_kg,\n       COALESCE(\n           r.low_stock_threshold_kg,\n           (SELECT NULLIF(value->>'kg','')::numeric FROM app_settings WHERE key = 'low_stock_threshold_kg'),\n           0\n       ) AS effective_threshold_kg\n  FROM resources r\n WHERE r.archived_at IS NULL\n   AND r.current_stock_kg < COALESCE(\n           r.low_stock_threshold_kg,\n           (SELECT NULLIF(value->>'kg','')::numeric FROM app_settings WHERE key = 'low_stock_threshold_kg'),\n           0\n       )\n ORDER BY r.current_stock_kg ASC\n LIMIT 10"};

/**
 * Query generated from SQL:
 * ```
 * SELECT r.id, r.name, r.current_stock_kg,
 *        COALESCE(
 *            r.low_stock_threshold_kg,
 *            (SELECT NULLIF(value->>'kg','')::numeric FROM app_settings WHERE key = 'low_stock_threshold_kg'),
 *            0
 *        ) AS effective_threshold_kg
 *   FROM resources r
 *  WHERE r.archived_at IS NULL
 *    AND r.current_stock_kg < COALESCE(
 *            r.low_stock_threshold_kg,
 *            (SELECT NULLIF(value->>'kg','')::numeric FROM app_settings WHERE key = 'low_stock_threshold_kg'),
 *            0
 *        )
 *  ORDER BY r.current_stock_kg ASC
 *  LIMIT 10
 * ```
 */
export const dashboardLowStock = new PreparedQuery<IDashboardLowStockParams,IDashboardLowStockResult>(dashboardLowStockIR);


/** 'DashboardPendingRequests' parameters type */
export type IDashboardPendingRequestsParams = void;

/** 'DashboardPendingRequests' return type */
export interface IDashboardPendingRequestsResult {
  classification: paint_classification;
  created_at: Date;
  id: number;
  ink_series: ink_series;
  origin: string | null;
  pack_size_kg: string;
  paint_name: string;
  quantity_packs: number;
  variant_id: number;
}

/** 'DashboardPendingRequests' query type */
export interface IDashboardPendingRequestsQuery {
  params: IDashboardPendingRequestsParams;
  result: IDashboardPendingRequestsResult;
}

const dashboardPendingRequestsIR: any = {"usedParamSet":{},"params":[],"statement":"SELECT pr.id, pr.variant_id, pr.pack_size_kg, pr.quantity_packs,\n       pr.origin::text AS origin, pr.created_at,\n       p.name AS paint_name, v.classification, v.ink_series\n  FROM production_requests pr\n  JOIN paint_variants v ON v.id = pr.variant_id\n  JOIN paints p ON p.id = v.paint_id\n WHERE pr.status = 'pending'\n ORDER BY pr.created_at ASC\n LIMIT 10"};

/**
 * Query generated from SQL:
 * ```
 * SELECT pr.id, pr.variant_id, pr.pack_size_kg, pr.quantity_packs,
 *        pr.origin::text AS origin, pr.created_at,
 *        p.name AS paint_name, v.classification, v.ink_series
 *   FROM production_requests pr
 *   JOIN paint_variants v ON v.id = pr.variant_id
 *   JOIN paints p ON p.id = v.paint_id
 *  WHERE pr.status = 'pending'
 *  ORDER BY pr.created_at ASC
 *  LIMIT 10
 * ```
 */
export const dashboardPendingRequests = new PreparedQuery<IDashboardPendingRequestsParams,IDashboardPendingRequestsResult>(dashboardPendingRequestsIR);


/** 'DashboardOpenPOs' parameters type */
export type IDashboardOpenPOsParams = void;

/** 'DashboardOpenPOs' return type */
export interface IDashboardOpenPOsResult {
  created_at: Date;
  id: number;
  status: string | null;
  supplier_id: number;
  supplier_name: string;
}

/** 'DashboardOpenPOs' query type */
export interface IDashboardOpenPOsQuery {
  params: IDashboardOpenPOsParams;
  result: IDashboardOpenPOsResult;
}

const dashboardOpenPOsIR: any = {"usedParamSet":{},"params":[],"statement":"SELECT po.id, po.supplier_id, s.name AS supplier_name,\n       po.status::text AS status, po.created_at\n  FROM purchase_orders po\n  JOIN suppliers s ON s.id = po.supplier_id\n WHERE po.archived_at IS NULL\n   AND po.status IN ('draft', 'ordered', 'shipped')\n ORDER BY po.created_at DESC\n LIMIT 10"};

/**
 * Query generated from SQL:
 * ```
 * SELECT po.id, po.supplier_id, s.name AS supplier_name,
 *        po.status::text AS status, po.created_at
 *   FROM purchase_orders po
 *   JOIN suppliers s ON s.id = po.supplier_id
 *  WHERE po.archived_at IS NULL
 *    AND po.status IN ('draft', 'ordered', 'shipped')
 *  ORDER BY po.created_at DESC
 *  LIMIT 10
 * ```
 */
export const dashboardOpenPOs = new PreparedQuery<IDashboardOpenPOsParams,IDashboardOpenPOsResult>(dashboardOpenPOsIR);


/** 'DashboardPendingDeviceApprovals' parameters type */
export type IDashboardPendingDeviceApprovalsParams = void;

/** 'DashboardPendingDeviceApprovals' return type */
export interface IDashboardPendingDeviceApprovalsResult {
  device: string | null;
  id: number;
  requested_at: Date;
  user_name: string;
}

/** 'DashboardPendingDeviceApprovals' query type */
export interface IDashboardPendingDeviceApprovalsQuery {
  params: IDashboardPendingDeviceApprovalsParams;
  result: IDashboardPendingDeviceApprovalsResult;
}

const dashboardPendingDeviceApprovalsIR: any = {"usedParamSet":{},"params":[],"statement":"SELECT d.id, u.username AS user_name, d.label AS device, d.created_at AS requested_at\n  FROM user_devices d\n  JOIN users u ON u.id = d.user_id\n WHERE d.status = 'pending'\n ORDER BY d.created_at DESC\n LIMIT 10"};

/**
 * Query generated from SQL:
 * ```
 * SELECT d.id, u.username AS user_name, d.label AS device, d.created_at AS requested_at
 *   FROM user_devices d
 *   JOIN users u ON u.id = d.user_id
 *  WHERE d.status = 'pending'
 *  ORDER BY d.created_at DESC
 *  LIMIT 10
 * ```
 */
export const dashboardPendingDeviceApprovals = new PreparedQuery<IDashboardPendingDeviceApprovalsParams,IDashboardPendingDeviceApprovalsResult>(dashboardPendingDeviceApprovalsIR);


/** 'DashboardFlaggedRunsLast30' parameters type */
export type IDashboardFlaggedRunsLast30Params = void;

/** 'DashboardFlaggedRunsLast30' return type */
export interface IDashboardFlaggedRunsLast30Result {
  batch_number: string;
  classification: paint_classification;
  completed_at: Date | null;
  dilution_total_kg: string;
  id: number;
  ink_series: ink_series;
  paint_name: string;
  variant_id: number;
  wastage_pct: string | null;
}

/** 'DashboardFlaggedRunsLast30' query type */
export interface IDashboardFlaggedRunsLast30Query {
  params: IDashboardFlaggedRunsLast30Params;
  result: IDashboardFlaggedRunsLast30Result;
}

const dashboardFlaggedRunsLast30IR: any = {"usedParamSet":{},"params":[],"statement":"SELECT r.id, r.batch_number, r.variant_id, p.name AS paint_name,\n       v.classification, v.ink_series,\n       r.wastage_pct, r.dilution_total_kg, r.completed_at\n  FROM production_runs r\n  JOIN paint_variants v ON v.id = r.variant_id\n  JOIN paints p ON p.id = v.paint_id\n WHERE r.completed_at >= NOW() - INTERVAL '30 days'\n   AND (r.wastage_flagged\n        OR r.dilution_flagged\n        OR EXISTS (SELECT 1 FROM production_resource_actuals a WHERE a.production_run_id = r.id AND a.flagged))\n ORDER BY r.completed_at DESC\n LIMIT 10"};

/**
 * Query generated from SQL:
 * ```
 * SELECT r.id, r.batch_number, r.variant_id, p.name AS paint_name,
 *        v.classification, v.ink_series,
 *        r.wastage_pct, r.dilution_total_kg, r.completed_at
 *   FROM production_runs r
 *   JOIN paint_variants v ON v.id = r.variant_id
 *   JOIN paints p ON p.id = v.paint_id
 *  WHERE r.completed_at >= NOW() - INTERVAL '30 days'
 *    AND (r.wastage_flagged
 *         OR r.dilution_flagged
 *         OR EXISTS (SELECT 1 FROM production_resource_actuals a WHERE a.production_run_id = r.id AND a.flagged))
 *  ORDER BY r.completed_at DESC
 *  LIMIT 10
 * ```
 */
export const dashboardFlaggedRunsLast30 = new PreparedQuery<IDashboardFlaggedRunsLast30Params,IDashboardFlaggedRunsLast30Result>(dashboardFlaggedRunsLast30IR);


/** 'DashboardOverdueSales' parameters type */
export type IDashboardOverdueSalesParams = void;

/** 'DashboardOverdueSales' return type */
export interface IDashboardOverdueSalesResult {
  billed: string | null;
  collected: string | null;
  currency: string;
  customer_id: number;
  customer_name: string;
  due_date: Date | null;
  id: number;
  order_id: number;
}

/** 'DashboardOverdueSales' query type */
export interface IDashboardOverdueSalesQuery {
  params: IDashboardOverdueSalesParams;
  result: IDashboardOverdueSalesResult;
}

const dashboardOverdueSalesIR: any = {"usedParamSet":{},"params":[],"statement":"SELECT s.id, s.order_id, s.customer_id, c.name AS customer_name,\n       s.due_date, s.currency,\n       (SELECT COALESCE(SUM(price_per_pack * quantity), 0) FROM sale_items WHERE sale_id = s.id) AS billed,\n       (SELECT COALESCE(SUM(amount), 0)                    FROM payments   WHERE sale_id = s.id) AS collected\n  FROM sales s\n  JOIN customers c ON c.id = s.customer_id\n WHERE s.archived_at IS NULL\n   AND s.due_date IS NOT NULL\n   AND s.due_date < CURRENT_DATE\n   AND (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE sale_id = s.id)\n       < (SELECT COALESCE(SUM(price_per_pack * quantity), 0) FROM sale_items WHERE sale_id = s.id)\n ORDER BY s.due_date ASC\n LIMIT 10"};

/**
 * Query generated from SQL:
 * ```
 * SELECT s.id, s.order_id, s.customer_id, c.name AS customer_name,
 *        s.due_date, s.currency,
 *        (SELECT COALESCE(SUM(price_per_pack * quantity), 0) FROM sale_items WHERE sale_id = s.id) AS billed,
 *        (SELECT COALESCE(SUM(amount), 0)                    FROM payments   WHERE sale_id = s.id) AS collected
 *   FROM sales s
 *   JOIN customers c ON c.id = s.customer_id
 *  WHERE s.archived_at IS NULL
 *    AND s.due_date IS NOT NULL
 *    AND s.due_date < CURRENT_DATE
 *    AND (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE sale_id = s.id)
 *        < (SELECT COALESCE(SUM(price_per_pack * quantity), 0) FROM sale_items WHERE sale_id = s.id)
 *  ORDER BY s.due_date ASC
 *  LIMIT 10
 * ```
 */
export const dashboardOverdueSales = new PreparedQuery<IDashboardOverdueSalesParams,IDashboardOverdueSalesResult>(dashboardOverdueSalesIR);


/** 'ProductionIrregularityReport' parameters type */
export interface IProductionIrregularityReportParams {
  from_date?: DateOrString | null | void;
  operator_id?: number | null | void;
  to_date?: DateOrString | null | void;
  variant_id?: number | null | void;
}

/** 'ProductionIrregularityReport' return type */
export interface IProductionIrregularityReportResult {
  actual_output_kg: string | null;
  batch_number: string;
  completed_at: Date | null;
  dilution_adjustments: unknown | null;
  dilution_flagged: boolean;
  dilution_total_kg: string;
  expected_output_kg: string;
  formula_id: number;
  id: number;
  operator: string;
  resource_variances: unknown | null;
  started_at: Date | null;
  status: string | null;
  variant_id: number;
  wastage_flagged: boolean;
  wastage_pct: string | null;
}

/** 'ProductionIrregularityReport' query type */
export interface IProductionIrregularityReportQuery {
  params: IProductionIrregularityReportParams;
  result: IProductionIrregularityReportResult;
}

const productionIrregularityReportIR: any = {"usedParamSet":{"from_date":true,"to_date":true,"variant_id":true,"operator_id":true},"params":[{"name":"from_date","required":false,"transform":{"type":"scalar"},"locs":[{"a":1591,"b":1600},{"a":1637,"b":1646}]},{"name":"to_date","required":false,"transform":{"type":"scalar"},"locs":[{"a":1657,"b":1664},{"a":1703,"b":1710}]},{"name":"variant_id","required":false,"transform":{"type":"scalar"},"locs":[{"a":1746,"b":1756},{"a":1790,"b":1800}]},{"name":"operator_id","required":false,"transform":{"type":"scalar"},"locs":[{"a":1811,"b":1822},{"a":1855,"b":1866}]}],"statement":"SELECT r.id, r.batch_number, r.variant_id, r.formula_id,\n       r.status::text AS status,\n       r.expected_output_kg, r.actual_output_kg, r.wastage_pct, r.wastage_flagged,\n       r.dilution_total_kg, r.dilution_flagged,\n       r.started_at, r.completed_at,\n       u.username AS operator,\n       COALESCE((\n           SELECT jsonb_agg(jsonb_build_object(\n               'resource_id',   a.resource_id,\n               'resource_name', res.name,\n               'expected_kg',   a.expected_kg,\n               'actual_kg',     a.actual_kg,\n               'variance_pct',  a.variance_pct,\n               'flagged',       a.flagged\n           ) ORDER BY a.flagged DESC, a.variance_pct DESC NULLS LAST)\n           FROM production_resource_actuals a\n           JOIN resources res ON res.id = a.resource_id\n           WHERE a.production_run_id = r.id\n       ), '[]'::jsonb) AS resource_variances,\n       COALESCE((\n           SELECT jsonb_agg(jsonb_build_object(\n               'resource_id',   d.resource_id,\n               'resource_name', res.name,\n               'kg_added',      d.kg_added,\n               'notes',         d.notes\n           ) ORDER BY d.id)\n           FROM production_dilution_adjustments d\n           JOIN resources res ON res.id = d.resource_id\n           WHERE d.production_run_id = r.id\n       ), '[]'::jsonb) AS dilution_adjustments\n  FROM production_runs r\n  JOIN users u ON u.id = r.created_by\n WHERE (r.wastage_flagged\n        OR r.dilution_flagged\n        OR EXISTS (SELECT 1 FROM production_resource_actuals a WHERE a.production_run_id = r.id AND a.flagged))\n   AND (:from_date::date IS NULL OR r.completed_at >= :from_date)\n   AND (:to_date::date   IS NULL OR r.completed_at <  :to_date::date + INTERVAL '1 day')\n   AND (:variant_id::int  IS NULL OR r.variant_id = :variant_id)\n   AND (:operator_id::int IS NULL OR r.created_by = :operator_id)\n ORDER BY r.completed_at DESC NULLS LAST, r.id DESC\n LIMIT 200"};

/**
 * Query generated from SQL:
 * ```
 * SELECT r.id, r.batch_number, r.variant_id, r.formula_id,
 *        r.status::text AS status,
 *        r.expected_output_kg, r.actual_output_kg, r.wastage_pct, r.wastage_flagged,
 *        r.dilution_total_kg, r.dilution_flagged,
 *        r.started_at, r.completed_at,
 *        u.username AS operator,
 *        COALESCE((
 *            SELECT jsonb_agg(jsonb_build_object(
 *                'resource_id',   a.resource_id,
 *                'resource_name', res.name,
 *                'expected_kg',   a.expected_kg,
 *                'actual_kg',     a.actual_kg,
 *                'variance_pct',  a.variance_pct,
 *                'flagged',       a.flagged
 *            ) ORDER BY a.flagged DESC, a.variance_pct DESC NULLS LAST)
 *            FROM production_resource_actuals a
 *            JOIN resources res ON res.id = a.resource_id
 *            WHERE a.production_run_id = r.id
 *        ), '[]'::jsonb) AS resource_variances,
 *        COALESCE((
 *            SELECT jsonb_agg(jsonb_build_object(
 *                'resource_id',   d.resource_id,
 *                'resource_name', res.name,
 *                'kg_added',      d.kg_added,
 *                'notes',         d.notes
 *            ) ORDER BY d.id)
 *            FROM production_dilution_adjustments d
 *            JOIN resources res ON res.id = d.resource_id
 *            WHERE d.production_run_id = r.id
 *        ), '[]'::jsonb) AS dilution_adjustments
 *   FROM production_runs r
 *   JOIN users u ON u.id = r.created_by
 *  WHERE (r.wastage_flagged
 *         OR r.dilution_flagged
 *         OR EXISTS (SELECT 1 FROM production_resource_actuals a WHERE a.production_run_id = r.id AND a.flagged))
 *    AND (:from_date::date IS NULL OR r.completed_at >= :from_date)
 *    AND (:to_date::date   IS NULL OR r.completed_at <  :to_date::date + INTERVAL '1 day')
 *    AND (:variant_id::int  IS NULL OR r.variant_id = :variant_id)
 *    AND (:operator_id::int IS NULL OR r.created_by = :operator_id)
 *  ORDER BY r.completed_at DESC NULLS LAST, r.id DESC
 *  LIMIT 200
 * ```
 */
export const productionIrregularityReport = new PreparedQuery<IProductionIrregularityReportParams,IProductionIrregularityReportResult>(productionIrregularityReportIR);


/** 'LossesOperatorSummary' parameters type */
export interface ILossesOperatorSummaryParams {
  from_date?: DateOrString | null | void;
  to_date?: DateOrString | null | void;
}

/** 'LossesOperatorSummary' return type */
export interface ILossesOperatorSummaryResult {
  flagged_runs: string | null;
  operator: string;
  operator_id: number;
  runs: string | null;
  wastage_kg: string | null;
}

/** 'LossesOperatorSummary' query type */
export interface ILossesOperatorSummaryQuery {
  params: ILossesOperatorSummaryParams;
  result: ILossesOperatorSummaryResult;
}

const lossesOperatorSummaryIR: any = {"usedParamSet":{"from_date":true,"to_date":true},"params":[{"name":"from_date","required":false,"transform":{"type":"scalar"},"locs":[{"a":701,"b":710},{"a":747,"b":756}]},{"name":"to_date","required":false,"transform":{"type":"scalar"},"locs":[{"a":767,"b":774},{"a":813,"b":820}]}],"statement":"SELECT u.id        AS operator_id,\n       u.username  AS operator,\n       COUNT(*)    AS runs,\n       COUNT(*) FILTER (WHERE r.wastage_flagged\n                          OR r.dilution_flagged\n                          OR EXISTS (\n                              SELECT 1 FROM production_resource_actuals a\n                               WHERE a.production_run_id = r.id AND a.flagged\n                          )) AS flagged_runs,\n       COALESCE(SUM(\n           CASE WHEN r.actual_output_kg IS NOT NULL\n                THEN GREATEST(r.expected_output_kg - r.actual_output_kg, 0)\n                ELSE 0 END\n       ), 0) AS wastage_kg\n  FROM production_runs r\n  JOIN users u ON u.id = r.created_by\n WHERE (:from_date::date IS NULL OR r.completed_at >= :from_date)\n   AND (:to_date::date   IS NULL OR r.completed_at <  :to_date::date + INTERVAL '1 day')\n GROUP BY u.id, u.username\n ORDER BY wastage_kg DESC, flagged_runs DESC\n LIMIT 50"};

/**
 * Query generated from SQL:
 * ```
 * SELECT u.id        AS operator_id,
 *        u.username  AS operator,
 *        COUNT(*)    AS runs,
 *        COUNT(*) FILTER (WHERE r.wastage_flagged
 *                           OR r.dilution_flagged
 *                           OR EXISTS (
 *                               SELECT 1 FROM production_resource_actuals a
 *                                WHERE a.production_run_id = r.id AND a.flagged
 *                           )) AS flagged_runs,
 *        COALESCE(SUM(
 *            CASE WHEN r.actual_output_kg IS NOT NULL
 *                 THEN GREATEST(r.expected_output_kg - r.actual_output_kg, 0)
 *                 ELSE 0 END
 *        ), 0) AS wastage_kg
 *   FROM production_runs r
 *   JOIN users u ON u.id = r.created_by
 *  WHERE (:from_date::date IS NULL OR r.completed_at >= :from_date)
 *    AND (:to_date::date   IS NULL OR r.completed_at <  :to_date::date + INTERVAL '1 day')
 *  GROUP BY u.id, u.username
 *  ORDER BY wastage_kg DESC, flagged_runs DESC
 *  LIMIT 50
 * ```
 */
export const lossesOperatorSummary = new PreparedQuery<ILossesOperatorSummaryParams,ILossesOperatorSummaryResult>(lossesOperatorSummaryIR);


