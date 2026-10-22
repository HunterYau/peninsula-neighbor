import { sqliteTable, text, integer, primaryKey, index, uniqueIndex } from 'drizzle-orm/sqlite-core';

export const profiles = sqliteTable('profiles', { id:text('id').primaryKey(), name:text('name').notNull(), area:text('area').notNull(), bio:text('bio').notNull().default('') });
export const posts = sqliteTable('posts', { id:text('id').primaryKey(), author:text('author').notNull().references(()=>profiles.id), type:text('type').notNull(), title:text('title').notNull(), body:text('body').notNull(), area:text('area').notNull(), topic:text('topic').notNull(), status:text('status').notNull().default('open'), created:text('created').notNull(), expires:text('expires').notNull() }, t=>[index('posts_created_idx').on(t.created),index('posts_author_idx').on(t.author)]);
export const comments = sqliteTable('comments', { id:text('id').primaryKey(), post:text('post').notNull().references(()=>posts.id,{onDelete:'cascade'}), author:text('author').notNull().references(()=>profiles.id), body:text('body').notNull(), created:text('created').notNull() }, t=>[index('comments_post_idx').on(t.post)]);
export const events = sqliteTable('events', { id:text('id').primaryKey(), author:text('author').notNull().references(()=>profiles.id), title:text('title').notNull(), body:text('body').notNull(), area:text('area').notNull(), location:text('location').notNull(), starts:text('starts').notNull(), ends:text('ends').notNull(), category:text('category').notNull(), access:text('access').notNull().default(''), capacity:integer('capacity').notNull().default(0), photo:text('photo').notNull().default(''), created:text('created').notNull() }, t=>[index('events_starts_idx').on(t.starts)]);
export const rsvps = sqliteTable('rsvps', { event:text('event').notNull().references(()=>events.id,{onDelete:'cascade'}), user:text('user').notNull().references(()=>profiles.id), created:text('created').notNull() }, t=>[primaryKey({columns:[t.event,t.user]})]);
export const preferences = sqliteTable('preferences', { user:text('user').primaryKey().references(()=>profiles.id), data:text('data').notNull(), updated:text('updated').notNull() });
export const hours = sqliteTable('hours', { id:text('id').primaryKey(), user:text('user').notNull().references(()=>profiles.id), org:text('org').notNull(), date:text('date').notNull(), minutes:integer('minutes').notNull(), notes:text('notes').notNull().default('') }, t=>[index('hours_user_idx').on(t.user)]);
export const reports = sqliteTable('reports', { id:text('id').primaryKey(), reporter:text('reporter').notNull().references(()=>profiles.id), target:text('target').notNull(), kind:text('kind').notNull(), reason:text('reason').notNull(), created:text('created').notNull(), status:text('status').notNull().default('pending'),note:text('note').notNull().default(''),reviewed:text('reviewed'),reviewer:text('reviewer').references(()=>profiles.id,{onDelete:'set null'}) },t=>[index('reports_status_created_idx').on(t.status,t.created)]);
export const rateLimits = sqliteTable('rate_limits', { id:text('id').primaryKey(), count:integer('count').notNull(), until:integer('until').notNull() });
export const conversations=sqliteTable('conversations',{
  id:text('id').primaryKey(),
  post:text('post').references(()=>posts.id,{onDelete:'set null'}),
  host:text('host').notNull().references(()=>profiles.id),
  guest:text('guest').notNull().references(()=>profiles.id),
  title:text('title').notNull(),created:text('created').notNull(),updated:text('updated').notNull(),
  hostRead:text('host_read').notNull().default(''),guestRead:text('guest_read').notNull().default(''),
  closedBy:text('closed_by').references(()=>profiles.id)
},t=>[uniqueIndex('conversation_post_guest_idx').on(t.post,t.guest),index('conversation_host_idx').on(t.host),index('conversation_guest_idx').on(t.guest)]);
export const messages=sqliteTable('messages',{
  id:text('id').primaryKey(),conversation:text('conversation').notNull().references(()=>conversations.id,{onDelete:'cascade'}),
  author:text('author').notNull().references(()=>profiles.id),body:text('body').notNull(),created:text('created').notNull()
},t=>[index('messages_conversation_idx').on(t.conversation,t.created)]);

export const discoveries=sqliteTable('discoveries',{
  id:text('id').primaryKey(),dedupe:text('dedupe').notNull(),source:text('source').notNull(),url:text('url').notNull(),
  title:text('title').notNull(),body:text('body').notNull(),area:text('area').notNull(),location:text('location').notNull(),
  starts:text('starts').notNull(),ends:text('ends').notNull(),category:text('category').notNull(),cost:text('cost').notNull().default('Check organizer'),
  status:text('status').notNull().default('published'),photo:text('photo').notNull().default(''),photoChecked:text('photo_checked').notNull().default(''),checked:text('checked').notNull(),created:text('created').notNull()
},t=>[uniqueIndex('discoveries_dedupe_idx').on(t.dedupe),index('discoveries_ends_idx').on(t.ends)]);
export const discoveryChecks=sqliteTable('discovery_checks',{
  source:text('source').primaryKey(),attempted:text('attempted').notNull(),succeeded:text('succeeded'),
  state:text('state').notNull(),note:text('note').notNull(),count:integer('count').notNull().default(0)
});
export const sightings=sqliteTable('sightings',{
  id:text('id').primaryKey(),author:text('author').notNull().references(()=>profiles.id),title:text('title').notNull(),
  body:text('body').notNull(),area:text('area').notNull(),location:text('location').notNull(),url:text('url').notNull().default(''),
  created:text('created').notNull(),expires:text('expires').notNull()
},t=>[index('sightings_expires_idx').on(t.expires)]);

export const memberSettings=sqliteTable('member_settings',{user:text('user').primaryKey().references(()=>profiles.id),data:text('data').notNull(),updated:text('updated').notNull()});
export const submissions=sqliteTable('submissions',{id:text('id').primaryKey(),author:text('author').notNull().references(()=>profiles.id),kind:text('kind').notNull(),data:text('data').notNull(),status:text('status').notNull().default('pending'),note:text('note').notNull().default(''),created:text('created').notNull(),reviewed:text('reviewed'),reviewer:text('reviewer')},t=>[index('submissions_status_idx').on(t.status)]);
export const contentReviews=sqliteTable('content_reviews',{id:text('id').primaryKey(),kind:text('kind').notNull(),status:text('status').notNull().default('pending'),note:text('note').notNull().default(''),reviewed:text('reviewed'),reviewer:text('reviewer')});
export const organizationClaims=sqliteTable('organization_claims',{id:text('id').primaryKey(),user:text('user').notNull().references(()=>profiles.id),organization:text('organization').notNull(),evidence:text('evidence').notNull(),status:text('status').notNull().default('pending'),note:text('note').notNull().default(''),created:text('created').notNull(),reviewed:text('reviewed')},t=>[uniqueIndex('claims_user_org_idx').on(t.user,t.organization)]);
export const hourVerifications=sqliteTable('hour_verifications',{hour:text('hour').primaryKey().references(()=>hours.id,{onDelete:'cascade'}),organization:text('organization').notNull(),status:text('status').notNull().default('linked'),note:text('note').notNull().default(''),requested:text('requested'),verified:text('verified'),verifier:text('verifier').references(()=>profiles.id)},t=>[index('hour_verifications_org_idx').on(t.organization)]);

export const mapReports=sqliteTable('map_reports',{id:text('id').primaryKey(),author:text('author').notNull().references(()=>profiles.id),kind:text('kind').notNull(),category:text('category').notNull(),area:text('area').notNull(),title:text('title').notNull(),details:text('details').notNull(),lat:text('lat').notNull(),lng:text('lng').notNull(),observed:text('observed').notNull(),sourceUrl:text('source_url').notNull().default(''),status:text('status').notNull().default('pending'),note:text('note').notNull().default(''),created:text('created').notNull(),reviewed:text('reviewed')},t=>[index('map_reports_status_idx').on(t.kind,t.status,t.observed)]);
export const mapSourceCache=sqliteTable('map_source_cache',{id:text('id').primaryKey(),data:text('data').notNull(),checked:text('checked').notNull()});

export const onboarding=sqliteTable('onboarding',{user:text('user').primaryKey().references(()=>profiles.id),completed:text('completed').notNull(),skipped:integer('skipped',{mode:'boolean'}).notNull().default(false)});

export const localAccounts=sqliteTable('local_accounts',{user:text('user').primaryKey().references(()=>profiles.id),email:text('email').notNull(),passwordHash:text('password_hash').notNull(),recoveryHash:text('recovery_hash').notNull(),created:text('created').notNull()},t=>[uniqueIndex('local_accounts_email_idx').on(t.email)]);
export const localSessions=sqliteTable('local_sessions',{hash:text('hash').primaryKey(),user:text('user').notNull().references(()=>localAccounts.user,{onDelete:'cascade'}),expires:integer('expires').notNull(),created:integer('created').notNull()},t=>[index('local_sessions_expiry_idx').on(t.expires),index('local_sessions_user_idx').on(t.user)]);

export const askChats=sqliteTable('ask_chats',{id:text('id').primaryKey(),user:text('user').notNull().references(()=>profiles.id,{onDelete:'cascade'}),title:text('title').notNull(),data:text('data').notNull(),created:text('created').notNull(),updated:text('updated').notNull(),revision:integer('revision').notNull().default(1),deleted:text('deleted')},t=>[index('ask_chats_user_updated_idx').on(t.user,t.updated)]);

export const activityPlans=sqliteTable('activity_plans',{id:text('id').primaryKey(),user:text('user').notNull().references(()=>profiles.id,{onDelete:'cascade'}),listing:text('listing'),data:text('data').notNull(),starts:text('starts'),ends:text('ends'),status:text('status').notNull().default('planned'),created:text('created').notNull(),updated:text('updated').notNull()},t=>[uniqueIndex('activity_plans_user_listing_idx').on(t.user,t.listing),index('activity_plans_user_starts_idx').on(t.user,t.starts)]);
