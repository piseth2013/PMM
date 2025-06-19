// Type definitions for reference - these would be TypeScript interfaces
// but are included as comments for JSDoc documentation

/**
 * @typedef {Object} Member
 * @property {string} id
 * @property {string} id_number
 * @property {string} name_en
 * @property {string} name_kh
 * @property {'male'|'female'|'other'} gender
 * @property {string} position_en
 * @property {string} position_kh
 * @property {string} party_branch_en
 * @property {string} party_branch_kh
 * @property {string|null} phone
 * @property {string|null} email
 * @property {string} date_registration
 * @property {string|null} profile_picture_url
 * @property {string[]|null} attachment_urls
 * @property {string} created_at
 * @property {string} updated_at
 */

/**
 * @typedef {Object} AdminUser
 * @property {string} id
 * @property {string} email
 * @property {string} full_name
 * @property {'admin'|'super_admin'} role
 * @property {string|null} invited_by
 * @property {string} created_at
 * @property {string|null} last_login
 */

/**
 * @typedef {Object} MemberFilters
 * @property {string} search
 * @property {string} branch
 * @property {string} position
 * @property {string} gender
 */

export {}