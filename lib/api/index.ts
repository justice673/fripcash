/**
 * Nest API client (FripCash-API fe-integration guides).
 * Base URL must include /api/v1 (deployed gateway).
 * Relative paths: Auth /auth/* · Product /* · Health /health
 */

export { ApiError, type ApiErrorBody, type AuthErrorBody } from "./errors";
export {
  api,
  readToken,
  writeToken,
  clearToken,
  setToken,
  removeToken,
  getToken,
  TOKEN_COOKIE,
} from "./client";

export {
  sendOtp,
  verifyOtp,
  requestAuthOtp,
  verifyAuthOtp,
  registerConsumer,
  loginWithPassword,
  registerCloudinarySign,
  forgotPasswordPhone,
  resetPasswordPhone,
  changePassword,
  signOut,
  getSession,
  adminLogin,
  adminSignInEmail,
  signInEmail,
  signUpEmail,
  sendVerificationEmail,
  verifyEmail,
  requestPasswordReset,
  resetPassword,
  type AuthUser,
  type VerifyOtpResponse,
} from "./auth";

export { fetchMe, updateMe, type Me } from "./me";

export {
  fetchCategories,
  fetchZones,
  fetchBestSellers,
  createCategory,
  updateCategory,
  deleteCategory,
  createZone,
  updateZone,
  deleteZone,
  type CatalogCategory,
  type CatalogZone,
  type ListingDestination,
} from "./catalog";

export {
  fetchListings,
  fetchMyListings,
  fetchMyListing,
  fetchListing,
  createListing,
  updateListing,
  updateListingPrice,
  updateListingStock,
  publishListing,
  hideListing,
  deleteListing,
  listingImageUrl,
  attachListingMedia,
  replaceListingMedia,
  deleteListingMedia,
  fetchListingComments,
  createListingComment,
  fetchListingReviews,
  fetchSellerReviews,
  createOrderReview,
  type Listing,
  type ListingMedia,
  type ListingStatus,
} from "./listings";

export {
  presignMedia,
  uploadListingMedia,
  cloudinarySign,
  uploadCatalogueImage,
  type CloudinaryFolder,
  type CloudinarySign,
  type CloudinaryUploadResult,
} from "./media";

export {
  becomeParticulier,
  applyForShop,
  fetchSellerVerification,
  closeParticulier,
  closeShop,
  downgradeToParticulier,
  updateBundleSettings,
  setVacation,
  fetchProductLibrary,
  createLibraryItem,
  publishLibraryItem,
  queueExcelImport,
} from "./sellers";

export {
  fetchMyKyc,
  submitMyKyc,
  uploadMyKycDocument,
  fetchOrgKyc,
  submitOrgKyc,
  uploadOrgKycDocument,
} from "./kyc";

export {
  getCart,
  clearCart as clearServerCart,
  addCartItem,
  updateCartItem,
  removeCartItem,
  validateCart,
  quoteCheckout,
  createPayment,
  getPayment,
  checkout,
  type Cart,
  type CheckoutAddress,
  type CheckoutQuote,
  type FulfillmentMode,
  type PaymentIntent,
} from "./cart";

export {
  fetchOrders,
  fetchPurchases,
  fetchSales,
  fetchOrder,
  fetchOrderTimeline,
  transitionOrderStatus,
  prepareOrder,
  readyOrder,
  confirmHandoff,
  confirmReceipt,
  rateOrder,
  sellerRefundOrder,
  markOrderCollected,
  markOrderInTransit,
  markOrderDelivered,
  openDispute,
  fetchInvoiceReceipt,
  type OrderStatus,
  type OrderListAs,
} from "./orders";

export {
  fetchWalletBalance,
  fetchWalletLedger,
  requestWithdraw,
  fetchWithdrawal,
  updatePayoutMsisdn,
} from "./wallet";

export { fetchFavorites, addFavorite, removeFavorite } from "./favorites";

export {
  fetchNotifications,
  markNotificationRead,
  registerDevice,
  fetchNotificationPreferences,
  upsertNotificationPreference,
} from "./notifications";

export {
  fetchMyOffers,
  fetchListingOffers,
  createOffer,
  acceptOffer,
  refuseOffer,
} from "./offers";

export {
  fetchConversations,
  createConversation,
  fetchMessages,
  sendMessage,
} from "./messaging";

export {
  fetchAdminMe,
  fetchPlatformSettings,
  updatePlatformSettings,
  fetchAuditLogs,
  provisionAudience,
  hideReview,
  hideComment,
  fetchSellerVerifications,
  approveSellerVerification,
  rejectSellerVerification,
  fetchAdminOrgKyc,
  fetchAdminIndividualKyc,
  approveOrgKyc,
  rejectOrgKyc,
  requestOrgKycResubmission,
  approveIndividualKyc,
  rejectIndividualKyc,
  resolveDispute,
  fetchAdminOrders,
  fetchAdminShippingRates,
  upsertAdminShippingRate,
  fetchAdminListings,
  updateAdminListing,
  fetchAuthAdminUsers,
  fetchAuthAdminUser,
  createAuthAdminUser,
  updateAuthAdminUser,
  setAuthAdminRole,
  setAuthAdminPassword,
  removeAuthAdminUser,
  listAuthAdminUserSessions,
  revokeAuthAdminUserSession,
  revokeAuthAdminUserSessions,
  impersonateAuthAdminUser,
  stopAuthAdminImpersonating,
  authAdminHasPermission,
  banAuthUser,
  unbanAuthUser,
  type AdminListing,
  type AuthAdminUser,
  type AuthAdminSession,
} from "./admin";

export {
  fetchCourierMe,
  updateCourierAvailability,
  fetchCourierMissions,
  fetchOpenMissions,
  acceptMission,
  progressMission,
  transferMission,
} from "./courier";

export { authorizePusher, authorizeBeams } from "./pusher";

export { fetchHealth, fetchReady } from "./health";

export {
  fetchAdminPromotions,
  fetchAdminPromotion,
  createAdminPromotion,
  updateAdminPromotion,
  deleteAdminPromotion,
  fetchHomePromotions,
  type Promotion,
  type PromotionKind,
  type PromotionStatus,
  type PromotionSurface,
  type PromotionListResponse,
  type CreatePromotionBody,
  type UpdatePromotionBody,
} from "./promotions";
