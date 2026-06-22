self.addEventListener("push", (event) => {
  let payload = {};

  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = {};
  }

  const title =
    typeof payload.title === "string" && payload.title
      ? payload.title
      : "ChemVault";
  const body =
    typeof payload.body === "string" && payload.body
      ? payload.body
      : "You have a new notification.";
  const link =
    typeof payload.link === "string" && payload.link ? payload.link : "/notifications";
  const notificationId =
    typeof payload.notificationId === "string" ? payload.notificationId : undefined;

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: typeof payload.icon === "string" ? payload.icon : "/icon-192.png",
      badge: typeof payload.badge === "string" ? payload.badge : "/badge-72.png",
      data: {
        link,
        notificationId,
      },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const link = event.notification.data?.link || "/notifications";
  const targetUrl = new URL(link, self.location.origin);

  event.waitUntil(
    self.clients
      .matchAll({
        type: "window",
        includeUncontrolled: true,
      })
      .then(async (clients) => {
        const matchingClient = clients.find((client) => {
          try {
            return new URL(client.url).href === targetUrl.href;
          } catch {
            return false;
          }
        });

        if (matchingClient) {
          return matchingClient.focus();
        }

        const sameOriginClient = clients.find((client) => {
          try {
            return new URL(client.url).origin === targetUrl.origin;
          } catch {
            return false;
          }
        });

        if (sameOriginClient && "navigate" in sameOriginClient) {
          await sameOriginClient.navigate(targetUrl.href);
          return sameOriginClient.focus();
        }

        return self.clients.openWindow(targetUrl.href);
      })
  );
});
