import _ from 'lodash'

import {
  ActivityColumnFilters,
  EnhancedGitHubEvent,
  EnhancedGitHubNotification,
  isEventPrivate,
  isItemRead,
  isNotificationPrivate,
  mergeSimilarEvents,
  NotificationColumnFilters,
  sortEvents,
  sortNotifications,
} from '@devhub/core'

export const filterRecordHasAnyForcedValue = (
  filtersRecord: Record<string, boolean | undefined> | undefined,
) => {
  if (!filtersRecord) return false
  return Object.values(filtersRecord).some(value => typeof value === 'boolean')
}

export const filterRecordHasThisValue = (
  filtersRecord: Record<string, boolean | undefined> | undefined,
  valueToCheck: boolean,
) => {
  if (!filtersRecord) return false
  return Object.values(filtersRecord).some(value => value === valueToCheck)
}

export function itemPassesFilterRecord(
  filtersRecord: Record<string, boolean | undefined> | undefined,
  value: any,
  defaultValue: boolean,
) {
  if (!filtersRecord) return defaultValue

  const hasForcedFilter = filterRecordHasAnyForcedValue(filtersRecord)
  if (!hasForcedFilter) return defaultValue

  const isFilterStrict =
    hasForcedFilter && filterRecordHasThisValue(filtersRecord, defaultValue)

  return filtersRecord[value] === !defaultValue ||
    (filtersRecord[value] !== defaultValue && isFilterStrict)
    ? !defaultValue
    : defaultValue
}

function baseColumnHasAnyFilter(
  filters: NotificationColumnFilters | undefined,
) {
  if (!filters) return false

  if (filters.clearedAt) return true
  if (typeof filters.private === 'boolean') return true
  if (typeof filters.saved === 'boolean') return true
  if (typeof filters.unread === 'boolean') return true

  return false
}

export function activityColumnHasAnyFilter(
  filters: ActivityColumnFilters | undefined,
) {
  if (!filters) return false

  if (baseColumnHasAnyFilter(filters)) return true

  if (
    filters.activity &&
    filterRecordHasAnyForcedValue(filters.activity.types)
  ) {
    return true
  }

  return false
}

export function notificationColumnHasAnyFilter(
  filters: NotificationColumnFilters | undefined,
) {
  if (!filters) return false

  if (baseColumnHasAnyFilter(filters)) return true

  if (filters.notifications && filters.notifications.participating) {
    return true
  }

  if (
    filters.notifications &&
    filterRecordHasAnyForcedValue(filters.notifications.reasons)
  ) {
    return true
  }

  return false
}

export function getFilteredNotifications(
  notifications: EnhancedGitHubNotification[],
  filters: NotificationColumnFilters | undefined,
) {
  let _notifications = sortNotifications(notifications)

  const reasonsFilter =
    filters && filters.notifications && filters.notifications.reasons

  if (filters && notificationColumnHasAnyFilter(filters)) {
    _notifications = _notifications.filter(notification => {
      if (!itemPassesFilterRecord(reasonsFilter, notification.reason, true))
        return false

      if (
        typeof filters.unread === 'boolean' &&
        filters.unread !== !isItemRead(notification)
      ) {
        return false
      }

      if (
        typeof filters.private === 'boolean' &&
        isNotificationPrivate(notification) !== filters.private
      ) {
        return false
      }

      const showSaveForLater = filters.saved !== false
      const showInbox = filters.saved !== true
      const showCleared = false

      if (
        filters.clearedAt &&
        (!notification.updated_at ||
          notification.updated_at <= filters.clearedAt)
      )
        if (!(showSaveForLater && notification.saved))
          /* && isItemRead(notification) */
          return showCleared

      if (notification.saved) return showSaveForLater

      return showInbox
    })
  }

  return _notifications
}

export function getFilteredEvents(
  events: EnhancedGitHubEvent[],
  filters: ActivityColumnFilters | undefined,
) {
  let _events = sortEvents(events)

  const activityFilter = filters && filters.activity && filters.activity.types

  if (filters && activityColumnHasAnyFilter(filters)) {
    _events = _events.filter(event => {
      if (!itemPassesFilterRecord(activityFilter, event.type, true))
        return false

      if (
        typeof filters.unread === 'boolean' &&
        filters.unread !== !isItemRead(event)
      ) {
        return false
      }

      if (
        typeof filters.private === 'boolean' &&
        isEventPrivate(event) !== filters.private
      ) {
        return false
      }

      const showSaveForLater = filters.saved !== false
      const showInbox = filters.saved !== true
      const showCleared = false

      if (
        filters.clearedAt &&
        (!event.created_at || event.created_at <= filters.clearedAt)
      )
        if (!(showSaveForLater && event.saved))
          /* && isItemRead(event) */
          return showCleared

      if (event.saved) return showSaveForLater

      return showInbox
    })
  }

  return mergeSimilarEvents(_events)
}
