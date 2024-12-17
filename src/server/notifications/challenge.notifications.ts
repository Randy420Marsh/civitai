import { NotificationCategory } from '~/server/common/enums';
import { createNotificationProcessor } from '~/server/notifications/base.notifications';
import { asOrdinal, numberWithCommas } from '~/utils/number-helpers';

export const systemNotifications = createNotificationProcessor({
  'challenge-winner': {
    displayName: 'Challenge Winner',
    category: NotificationCategory.System,
    toggleable: false,
    prepareMessage: ({ details }) => ({
      message: `You placed ${asOrdinal(details.position)} in the "${
        details.challengeName
      }" challenge! You've won ${numberWithCommas(details.prize)} Buzz.`,
      url: `/articles/${details.articleId}`,
    }),
  },
  'challenge-participation': {
    displayName: 'Challenge Participation',
    category: NotificationCategory.System,
    toggleable: false,
    prepareMessage: ({ details }) => ({
      message: `You've submitted enough entries to earn the participation prize in the "${
        details.challengeName
      }" challenge! You've won ${numberWithCommas(details.prize)} Buzz.`,
      url: `/articles/${details.articleId}`,
    }),
  },
  'challenge-rejection': {
    displayName: 'Challenge Rejection',
    category: NotificationCategory.System,
    toggleable: false,
    prepareMessage: ({ details }) => ({
      message: `${details.count} entries to the "${details.challengeName}" challenge have been declined. Consider making new entries to improve your chances of winning!`,
      url: `/articles/${details.articleId}`,
    }),
  },
});
