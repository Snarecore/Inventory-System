import {
	FaThLarge,
	FaListUl,
	FaCubes,
	FaShoppingCart,
	FaUserShield,
	FaStore,
	FaUser,
	FaComments,
	FaHome,
	FaAddressBook,
	FaExchangeAlt,
	FaLayerGroup,
	FaShareAlt,
	FaBlog,
	FaSearch,
	FaCube,
} from "react-icons/fa";
import { TbTablePlus } from "react-icons/tb";

export const menu = [
	{
		sectionName: "Main",
		items: [
			{
				id: 1,
				name: "Dashboard",
				title: "Dashboard",
				icon: FaThLarge,
				path: "/admin",
				subItems: [],
			},
		],
	},
	{
		sectionName: "Inventory",
		items: [
			{
				id: 2,
				name: "Category",
				title: "Category",
				icon: FaListUl,
				path: "/admin/main-category",
				subItems: [
					{ id: 1, name: "Main Category", path: "/admin/main-category" },
					{ id: 2, name: "First Category", path: "/admin/first-category" },
					{ id: 3, name: "Second Category", path: "/admin/second-category" },
					{ id: 4, name: "Third Category", path: "/admin/third-category" },
				],
			},
			{
				id: 3,
				name: "Product",
				title: "Product",
				icon: FaCube,
				path: "/admin/products",
				subItems: [],
			},
			{
				id: 4,
				name: "Create Product",
				title: "Create Product",
				icon: TbTablePlus,
				path: "/admin/create-product",
				subItems: [],
			},
		],
	},
	{
		sectionName: "Order",
		items: [
			{
				id: 5,
				name: "Orders",
				title: "Orders",
				icon: FaShoppingCart,
				path: "/admin/orders",
				subItems: [],
			},
		],
	},
	{
		sectionName: "People",
		items: [
			{
				id: 6,
				name: "Admins",
				title: "Admins",
				icon: FaUserShield,
				path: "/admin/admins",
				subItems: [],
			},
			{
				id: 7,
				name: "Vendors",
				title: "Vendors",
				icon: FaStore,
				path: "/admin/vendors",
				subItems: [],
			},
			{
				id: 8,
				name: "Users",
				title: "Users",
				icon: FaUser,
				path: "/admin/users",
				subItems: [],
			},
		],
	},
	{
		sectionName: "Chat",
		items: [
			{
				id: 9,
				name: "Chat",
				title: "Chat",
				icon: FaComments,
				path: "/admin/chat",
				subItems: [],
			},
		],
	},
	{
		sectionName: "Settings",
		items: [
			{
				id: 10,
				name: "Home",
				title: "Home",
				icon: FaHome,
				path: "/admin/hero-slider",
				subItems: [
					{ id: 1, name: "Hero Slider", path: "/admin/hero-slider" },
					{ id: 2, name: "Promotions", path: "/admin/promotions" },
					{ id: 3, name: "Page CMS", path: "/admin/home-page-cms" },
				],
			},
			{
				id: 11,
				name: "Contact",
				title: "Contact",
				icon: FaAddressBook,
				path: "/admin/contact-message",
				subItems: [
					{ id: 1, name: "Contact Message", path: "/admin/contact-message" },
					{ id: 2, name: "Contact Page CMS", path: "/admin/contact-page-cms" },
				],
			},
			{
				id: 12,
				name: "Policy",
				title: "Policy",
				icon: FaExchangeAlt,
				path: "/admin/exchange-policy",
				subItems: [
					{ id: 1, name: "Exchange & Return", path: "/admin/exchange-policy" },
					{ id: 2, name: "Privacy", path: "/admin/privacy-policy" },
					{ id: 3, name: "Terms & Conditions", path: "/admin/terms-conditions" },
				],
			},
			{
				id: 13,
				name: "Header Footer CMS",
				title: "Header Footer CMS",
				icon: FaLayerGroup,
				path: "/admin/header-footer-cms",
				subItems: [],
			},
			{
				id: 14,
				name: "Shop Page CMS",
				title: "Shop Page CMS",
				icon: FaStore,
				path: "/admin/shop-page-cms",
				subItems: [],
			},
			{
				id: 15,
				name: "Social Links",
				title: "Social Links",
				icon: FaShareAlt,
				path: "/admin/social-link",
				subItems: [],
			},
			{
				id: 16,
				name: "Blogs",
				title: "Blogs",
				icon: FaBlog,
				path: "/admin/blogs",
				subItems: [],
			},
		],
	},
	{
		sectionName: "SEO",
		items: [
			{
				id: 17,
				name: "Page Meta",
				title: "Page Meta",
				icon: FaSearch,
				path: "/admin/page-meta",
				subItems: [],
			},
		],
	},
];
