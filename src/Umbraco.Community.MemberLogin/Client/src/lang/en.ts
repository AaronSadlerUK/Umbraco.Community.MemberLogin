export default {
  memberLogin: {
    action: "Login as Member",
    headline: "Login as Member",
    confirm: (name: unknown) => `You are about to login as member ${name ?? ""}.`,
    culture: "Culture",
    redirectPage: "Redirect page",
    rootHint: "You will be redirected to the root page '/' of the website.",
    add: "Add",
    remove: "Remove",
    submit: "Login as Member",
    errorHeadline: "Member login failed",
    errorMessage: "Could not sign in as this member.",
  },
};
