export const onRequest: PagesFunction = async (context) => {
  try {
    return await context.env.ASSETS.fetch(context.request);
  } catch {
    return context.env.ASSETS.fetch('/index.html');
  }
};
