import { sqliteTable, text, integer, primaryKey, index, uniqueIndex } from 'drizzle-orm/sqlite-core';

export const profiles = sqliteTable('profiles', { id:text('id').primaryKey(), name:text('name').notNull(), area:text('area').notNull(), bio:text('bio').notNull().default('') });
export const posts = sqliteTable('posts', { id:text('id').primaryKey(), author:text('author').notNull().references(()=>profiles.id), type:text('type').notNull(), title:text('title').notNull(), body:text('body').notNull(), area:text('area').notNull(), topic:text('topic').notNull(), status:text('status').notNull().default('open'), created:text('created').notNull(), expires:text('expires').notNull() }, t=>[index('posts_created_idx').on(t.created),index('posts_author_idx').on(t.author)]);
export const comments = sqliteTable('comments', { id:text('id').primaryKey(), post:text('post').notNull().references(()=>posts.id,{onDelete:'cascade'}), author:text('author').notNull().references(()=>profiles.id), body:text('body').notNull(), created:text('created').notNull() }, t=>[index('comments_post_idx').on(t.post)]);
export const events = sqliteTable('events', { id:text('id').primaryKey(), author:text('author').notNull().references(()=>profiles.id), title:text('title').notNull(), body:text('body').notNull(), area:text('area').notNull(), location:text('location').notNull(), starts:text('starts').notNull(), ends:text('ends').notNull(), category:text('category').notNull(), access:text('access').notNull().default(''), capacity:integer('capacity').notNull().default(0), created:text('created').notNull() }, t=>[index('events_starts_idx').on(t.starts)]);
export const rsvps = sqliteTable('rsvps', { event:text('event').notNull().references(()=>events.id,{onDelete:'cascade'}), user:text('user').notNull().references(()=>profiles.id), created:text('created').notNull() }, t=>[primaryKey({columns:[t.event,t.user]})]);
export const preferences = sqliteTable('preferences', { user:text('user').primaryKey().references(()=>profiles.id), data:text('data').notNull(), updated:text('updated').notNull() });
export const hours = sqliteTable('hours', { id:text('id').primaryKey(), user:text('user').notNull().references(()=>profiles.id), org:text('org').notNull(), date:text('date').notNull(), minutes:integer('minutes').notNull(), notes:text('notes').notNull().default('') }, t=>[index('hours_user_idx').on(t.user)]);
export const reports = sqliteTable('reports', { id:text('id').primaryKey(), reporter:text('reporter').notNull().references(()=>profiles.id), target:text('target').notNull(), kind:text('kind').notNull(), reason:text('reason').notNull(), created:text('created').notNull(), status:text('status').notNull().default('pending') });
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
