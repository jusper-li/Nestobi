import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { CartProvider } from './contexts/CartContext';
import { LanguageProvider } from './contexts/LanguageContext';
import { SiteSettingsProvider } from './contexts/SiteSettingsContext';
import CookieConsent from './components/CookieConsent';
import MobileBottomNav from './components/MobileBottomNav';
import ScrollToTop from './components/ScrollToTop';
import { UserRoute, AdminRoute, SuperAdminRoute, VendorRoute, GuestRoute, PermissionRoute, StoreManagerRoute } from './components/ProtectedRoute';

import Home from './pages/Home';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import VerifyEmail from './pages/auth/VerifyEmail';
import ResetPassword from './pages/auth/ResetPassword';
import NewPassword from './pages/auth/NewPassword';
import Contact from './pages/Contact';
import StaticPage from './pages/StaticPage';
import Services from './pages/Services';
import FAQPage from './pages/FAQPage';
import StoreLocations from './pages/StoreLocations';

import BlogList from './pages/blog/BlogList';
import BlogDetail from './pages/blog/BlogDetail';
import AdminBlog from './pages/admin/AdminBlog';
import AdminBlogForm from './pages/admin/AdminBlogForm';

import RoomList from './pages/rooms/RoomList';
import RoomDetail from './pages/rooms/RoomDetail';
import HotelDetail from './pages/rooms/HotelDetail';
import BookingForm from './pages/booking/BookingForm';

import ProductList from './pages/shop/ProductList';
import ProductDetail from './pages/shop/ProductDetail';
import Cart from './pages/shop/Cart';

import MemberLayout from './pages/member/MemberLayout';
import MemberDashboard from './pages/member/MemberDashboard';
import Profile from './pages/member/Profile';
import MemberBookings from './pages/member/MemberBookings';
import MemberOrders from './pages/member/MemberOrders';
import PurchaseHistory from './pages/member/PurchaseHistory';
import Points from './pages/member/Points';
import Preferences from './pages/member/Preferences';
import StoreAdminDashboard from './pages/storeadmin/StoreAdminDashboard';

import ItineraryPlanner from './pages/ai/ItineraryPlanner';
import Translator from './pages/ai/Translator';
import Chatbot from './pages/ai/Chatbot';
import TravelPassport from './pages/ai/TravelPassport';
import CoffeeQuiz from './pages/ai/CoffeeQuiz';

import AdminLayout from './pages/admin/AdminLayout';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminVendors from './pages/admin/AdminVendors';
import AdminRooms from './pages/admin/AdminRooms';
import AdminRoomForm from './pages/admin/AdminRoomForm';
import AdminRoomInventory from './pages/admin/AdminRoomInventory';
import AdminProducts from './pages/admin/AdminProducts';
import AdminProductForm from './pages/admin/AdminProductForm';
import AdminOrders from './pages/admin/AdminOrders';
import AdminUsers from './pages/admin/AdminUsers';
import AIAnalytics from './pages/admin/AIAnalytics';
import AdminStaticPages from './pages/admin/AdminStaticPages';

import SuperAdminLayout from './pages/superadmin/SuperAdminLayout';
import SuperAdminDashboard from './pages/superadmin/SuperAdminDashboard';
import SuperAdminUsers from './pages/superadmin/SuperAdminUsers';
import SuperAdminVendors from './pages/superadmin/SuperAdminVendors';
import SuperAdminRevenue from './pages/superadmin/SuperAdminRevenue';
import SuperAdminRooms from './pages/superadmin/SuperAdminRooms';
import SuperAdminProducts from './pages/superadmin/SuperAdminProducts';
import SuperAdminProductCategories from './pages/superadmin/SuperAdminProductCategories';
import SuperAdminOrders from './pages/superadmin/SuperAdminOrders';
import SuperAdminAIAnalytics from './pages/superadmin/SuperAdminAIAnalytics';
import SuperAdminChatbot from './pages/superadmin/SuperAdminChatbot';
import SuperAdminRoomForm from './pages/superadmin/SuperAdminRoomForm';
import SuperAdminProductForm from './pages/superadmin/SuperAdminProductForm';
import Permissions from './pages/superadmin/Permissions';
import SuperAdminSiteSettings from './pages/superadmin/SuperAdminSiteSettings';
import SuperAdminFAQ from './pages/superadmin/SuperAdminFAQ';
import SuperAdminListingCommand from './pages/superadmin/SuperAdminListingCommand';
import SuperAdminBlog from './pages/superadmin/SuperAdminBlog';
import SuperAdminBlogForm from './pages/superadmin/SuperAdminBlogForm';
import SuperAdminBlogCategories from './pages/superadmin/SuperAdminBlogCategories';
import SuperAdminStoreLocations from './pages/superadmin/SuperAdminStoreLocations';
import SuperAdminCoffeeQuiz from './pages/superadmin/SuperAdminCoffeeQuiz';
import SuperAdminRoomTranslations from './pages/superadmin/SuperAdminRoomTranslations';
import SuperAdminThemeBanners from './pages/superadmin/SuperAdminThemeBanners';

import VendorLayout from './pages/vendor/VendorLayout';
import VendorDashboard from './pages/vendor/VendorDashboard';
import VendorHotels from './pages/vendor/VendorHotels';
import VendorRooms from './pages/vendor/VendorRooms';
import VendorHousekeeping from './pages/vendor/VendorHousekeeping';
import VendorRoomInventory from './pages/vendor/VendorRoomInventory';
import VendorStaff from './pages/vendor/VendorStaff';
import VendorProducts from './pages/vendor/VendorProducts';
import VendorOrders from './pages/vendor/VendorOrders';
import VendorProfile from './pages/vendor/VendorProfile';
import VendorBlog from './pages/vendor/VendorBlog';
import VendorBlogForm from './pages/vendor/VendorBlogForm';
import EngagementManagement from './pages/management/EngagementManagement';

function AppShell() {
  const location = useLocation();
  const pathname = location.pathname;
  const hasGlobalBottomNav =
    !pathname.startsWith('/ai/chat') &&
    !pathname.startsWith('/admin') &&
    !pathname.startsWith('/superadmin') &&
    !pathname.startsWith('/vendor') &&
    !pathname.startsWith('/member/store-admin') &&
    !pathname.startsWith('/store-admin');

  return (
    <SiteSettingsProvider>
      <LanguageProvider>
        <AuthProvider>
          <CartProvider>
            <ScrollToTop />
            <div className={`min-h-screen ${hasGlobalBottomNav ? 'pb-[calc(5.75rem+env(safe-area-inset-bottom))] md:pb-0' : ''}`}>
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/nestobi" element={<Navigate to="/rooms" replace />} />
                <Route path="/nestopia" element={<Navigate to="/rooms" replace />} />
                <Route path="/genbon-travel" element={<Navigate to="/shop" replace />} />
                <Route path="/coffee-traveler" element={<Navigate to="/blog" replace />} />
                <Route path="/rooms" element={<RoomList />} />
                <Route path="/rooms/:id" element={<RoomDetail />} />
                <Route path="/hotels/:id" element={<HotelDetail />} />
                <Route path="/shop" element={<ProductList />} />
                <Route path="/shop/:id" element={<ProductDetail />} />
                <Route path="/blog" element={<BlogList />} />
                <Route path="/blog/:slug" element={<BlogDetail />} />
                <Route path="/stores" element={<StoreLocations />} />
                <Route path="/store-locator" element={<StoreLocations />} />

                <Route path="/auth/login" element={<GuestRoute><Login /></GuestRoute>} />
                <Route path="/auth/register" element={<GuestRoute><Register /></GuestRoute>} />
                <Route path="/auth/verify" element={<VerifyEmail />} />
                <Route path="/auth/reset-password" element={<GuestRoute><ResetPassword /></GuestRoute>} />
                <Route path="/auth/new-password" element={<NewPassword />} />
                <Route path="/contact" element={<Contact />} />
                <Route path="/services" element={<Services />} />
                <Route path="/faq" element={<FAQPage />} />

                <Route path="/about" element={<StaticPage />} />
                <Route path="/privacy" element={<StaticPage />} />
                <Route path="/terms" element={<StaticPage />} />
                <Route path="/cookies" element={<StaticPage />} />
                <Route path="/anti-fraud" element={<StaticPage />} />

                <Route path="/booking/:roomId" element={<UserRoute><BookingForm /></UserRoute>} />
                <Route path="/cart" element={<Cart />} />

                <Route path="/ai/itinerary" element={<UserRoute><ItineraryPlanner /></UserRoute>} />
                <Route path="/ai/translator" element={<UserRoute><Translator /></UserRoute>} />
                <Route path="/ai/chat" element={<UserRoute><Chatbot /></UserRoute>} />
                <Route path="/ai/coffee-quiz" element={<UserRoute><CoffeeQuiz /></UserRoute>} />
                <Route path="/ai/passport" element={<UserRoute><TravelPassport /></UserRoute>} />

                <Route path="/member" element={<UserRoute><MemberLayout /></UserRoute>}>
                  <Route index element={<MemberDashboard />} />
                  <Route path="profile" element={<Profile />} />
                  <Route path="bookings" element={<MemberBookings />} />
                  <Route path="orders" element={<MemberOrders />} />
                  <Route path="purchases" element={<PurchaseHistory />} />
                  <Route path="points" element={<Points />} />
                  <Route path="preferences" element={<Preferences />} />
                  <Route path="store-admin" element={<StoreManagerRoute><StoreAdminDashboard /></StoreManagerRoute>} />
                </Route>

                <Route path="/vendor" element={<VendorRoute><VendorLayout /></VendorRoute>}>
                  <Route index element={<VendorDashboard />} />
                  <Route path="store-admin" element={<StoreManagerRoute><StoreAdminDashboard /></StoreManagerRoute>} />
                  <Route path="hotels" element={<VendorHotels />} />
                  <Route path="rooms" element={<VendorRooms />} />
                  <Route path="housekeeping" element={<VendorHousekeeping />} />
                  <Route path="housekeeping/:roomId" element={<VendorRoomInventory />} />
                  <Route path="staff" element={<VendorStaff />} />
                  <Route path="products" element={<VendorProducts />} />
                  <Route path="orders" element={<VendorOrders />} />
                  <Route path="engagement" element={<EngagementManagement mode="vendor" />} />
                  <Route path="blog" element={<VendorBlog />} />
                  <Route path="blog/new" element={<VendorBlogForm />} />
                  <Route path="blog/:id" element={<VendorBlogForm />} />
                  <Route path="profile" element={<VendorProfile />} />
                </Route>

                <Route path="/admin" element={<AdminRoute><AdminLayout /></AdminRoute>}>
                  <Route index element={<AdminDashboard />} />
                  <Route path="vendors" element={<PermissionRoute permission="manage_vendors"><AdminVendors /></PermissionRoute>} />
                  <Route path="rooms" element={<PermissionRoute permission="manage_rooms"><AdminRooms /></PermissionRoute>} />
                  <Route path="rooms/new" element={<PermissionRoute permission="manage_rooms"><AdminRoomForm /></PermissionRoute>} />
                  <Route path="rooms/:id" element={<PermissionRoute permission="manage_rooms"><AdminRoomForm /></PermissionRoute>} />
                  <Route path="rooms/:roomId/inventory" element={<PermissionRoute permission="manage_rooms"><AdminRoomInventory /></PermissionRoute>} />
                  <Route path="products" element={<PermissionRoute permission="manage_products"><AdminProducts /></PermissionRoute>} />
                  <Route path="products/new" element={<PermissionRoute permission="manage_products"><AdminProductForm /></PermissionRoute>} />
                  <Route path="products/:id" element={<PermissionRoute permission="manage_products"><AdminProductForm /></PermissionRoute>} />
                  <Route path="orders" element={<PermissionRoute permission="manage_orders"><AdminOrders /></PermissionRoute>} />
                  <Route path="engagement" element={<PermissionRoute permission="manage_orders"><EngagementManagement mode="admin" /></PermissionRoute>} />
                  <Route path="users" element={<PermissionRoute permission="manage_users"><AdminUsers /></PermissionRoute>} />
                  <Route path="ai-analytics" element={<PermissionRoute permission="view_ai"><AIAnalytics /></PermissionRoute>} />
                  <Route path="static-pages" element={<PermissionRoute permission="manage_static_pages"><AdminStaticPages /></PermissionRoute>} />
                  <Route path="blog" element={<PermissionRoute permission="manage_blog"><AdminBlog /></PermissionRoute>} />
                  <Route path="blog/new" element={<PermissionRoute permission="manage_blog"><AdminBlogForm /></PermissionRoute>} />
                  <Route path="blog/:id" element={<PermissionRoute permission="manage_blog"><AdminBlogForm /></PermissionRoute>} />
                </Route>

                <Route path="/superadmin" element={<SuperAdminRoute><SuperAdminLayout /></SuperAdminRoute>}>
                  <Route index element={<SuperAdminDashboard />} />
                  <Route path="users" element={<SuperAdminUsers />} />
                  <Route path="vendors" element={<SuperAdminVendors />} />
                  <Route path="rooms" element={<SuperAdminRooms />} />
                  <Route path="room-translations" element={<SuperAdminRoomTranslations />} />
                  <Route path="rooms/new" element={<SuperAdminRoomForm />} />
                  <Route path="rooms/:id" element={<SuperAdminRoomForm />} />
                  <Route path="products" element={<SuperAdminProducts />} />
                  <Route path="product-categories" element={<SuperAdminProductCategories />} />
                  <Route path="products/new" element={<SuperAdminProductForm />} />
                  <Route path="products/:id" element={<SuperAdminProductForm />} />
                  <Route path="orders" element={<SuperAdminOrders />} />
                  <Route path="engagement" element={<EngagementManagement mode="superadmin" />} />
                  <Route path="revenue" element={<SuperAdminRevenue />} />
                  <Route path="ai-analytics" element={<SuperAdminAIAnalytics />} />
                  <Route path="chatbot" element={<SuperAdminChatbot />} />
                  <Route path="static-pages" element={<AdminStaticPages />} />
                  <Route path="permissions" element={<Permissions />} />
                  <Route path="site-settings" element={<SuperAdminSiteSettings />} />
                  <Route path="theme-banners" element={<SuperAdminThemeBanners />} />
                  <Route path="store-locations" element={<SuperAdminStoreLocations />} />
                  <Route path="faq" element={<SuperAdminFAQ />} />
                  <Route path="listing-command" element={<SuperAdminListingCommand />} />
                  <Route path="blog" element={<SuperAdminBlog />} />
                  <Route path="blog/new" element={<SuperAdminBlogForm />} />
                  <Route path="blog/:id" element={<SuperAdminBlogForm />} />
                  <Route path="blog-categories" element={<SuperAdminBlogCategories />} />
                  <Route path="coffee-quiz" element={<SuperAdminCoffeeQuiz />} />
                </Route>

                <Route path="/admin/login" element={<Navigate to="/auth/login" replace />} />
                <Route path="/admin/dashboard" element={<Navigate to="/admin" replace />} />
                <Route path="/store-admin" element={<Navigate to="/member/store-admin" replace />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </div>
            <MobileBottomNav />
            <CookieConsent />
          </CartProvider>
        </AuthProvider>
      </LanguageProvider>
    </SiteSettingsProvider>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppShell />
    </BrowserRouter>
  );
}

export default App;
