import { http, HttpResponse } from 'msw';
import { branches } from '@/mocks/data/branches';
import { authedUser, unauthorized, wait } from '@/mocks/handlers/shared';

export const branchHandlers = [
  // Any signed-in user may list the branches, as on the real server.
  http.get('*/api/branches', async ({ request }) => {
    await wait();
    return authedUser(request) ? HttpResponse.json(branches) : unauthorized();
  }),
];
