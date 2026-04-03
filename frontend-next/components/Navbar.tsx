"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { publicAsset } from "@/lib/paths";
import SearchBar from "./searchbar";
import { fetchSearchResults } from "@/lib/searchApi";

type StoredUser = {
    _id?: string;
};

const DEFAULT_AVATAR = publicAsset("/avatar-default.svg");
const USER_STATE_EVENT = "artport-user-updated";
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

export default function Navbar() {
    const router = useRouter()
    const [isOpen, setIsOpen] = useState(false)
    const [isLoggedIn, setIsLoggedIn] = useState(false)
    const [avatarSrc, setAvatarSrc] = useState(DEFAULT_AVATAR)

    const syncUserState = useCallback(async () => {
        const token = localStorage.getItem("token")
        setIsLoggedIn(!!token)

        if (!token) {
            setAvatarSrc(DEFAULT_AVATAR)
            return
        }

        try {
            const rawUser = localStorage.getItem("user")
            const user = rawUser ? (JSON.parse(rawUser) as StoredUser) : null
            const userId = user?._id ? String(user._id) : ""
            if (!userId) {
                setAvatarSrc(DEFAULT_AVATAR)
                return
            }

            const res = await fetch(`${API_URL}/api/users/${encodeURIComponent(userId)}`)
            if (!res.ok) {
                setAvatarSrc(DEFAULT_AVATAR)
                return
            }

            const data = (await res.json().catch(() => ({}))) as {
                profilePictureUrl?: string
            }
            setAvatarSrc(data.profilePictureUrl || DEFAULT_AVATAR)
        } catch {
            setAvatarSrc(DEFAULT_AVATAR)
        }
    }, [])

    useEffect(() => {
        void syncUserState()

        const handleUserUpdate = () => {
            void syncUserState()
        }
        window.addEventListener(USER_STATE_EVENT, handleUserUpdate)
        window.addEventListener("storage", handleUserUpdate)

        return () => {
            window.removeEventListener(USER_STATE_EVENT, handleUserUpdate)
            window.removeEventListener("storage", handleUserUpdate)
        }
    }, [syncUserState])

    const handleSearch = (query?: any, filter?: any) => {
        console.log("Searching:", query, "Filter:", filter)
    }

    const handleLogout = () => {
        localStorage.removeItem('token')
        localStorage.removeItem('user')
        setIsLoggedIn(false)
        setIsOpen(false)
        setAvatarSrc(DEFAULT_AVATAR)
        router.push('/')
    }

    const toggleMenu = () => {
        void syncUserState()
        setIsOpen(!isOpen)
    }

    const handleProfileClick = () => {
        if (!isLoggedIn) {
            router.push('/login')
            return
        }
        toggleMenu()
    }

    return (
        <header style={{
            backgroundColor: '#ffd29e',
            display: 'flex',
            alignItems: 'center',
            padding: '12px',
            gap: '16px'
        }}>

            {/* Logo */}
            <div style={{ flex: 1 }}>
                <Link href="/" style={{
                    color: '#ffffff',
                    fontWeight: 'bold',
                    fontSize: '24px',
                    whiteSpace: 'nowrap'
                }}>
                    ArtPort
                </Link>
            </div>


            {/* Search bar container */}
            <div style={{
                flex: 1,
                display: 'flex',
                justifyContent: 'center'
            }}>
                <div style={{
                    width: '100%',
                    maxWidth: '500px'
                }}>
                    <SearchBar
                        placeholder="Search artwork..."
                        onSearch={handleSearch}
                        loadResults={fetchSearchResults}
                        onSelectResult={() => {}}
                    />
                </div>
            </div>


            {/* Upload Profile and profile button wrapper*/}
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '16px' }}>

                {/* Upload button */}
                <div style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    border: '2px solid #ffffff',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#ffffff',
                    fontSize: '24px',
                    fontWeight: '300',

                }}>
                    <Link href="/upload">+</Link>
                </div>


                {/* Profile menu */}
                <button
                    type="button"
                    onClick={handleProfileClick}
                    aria-label="Open user menu"
                    style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '50%',
                        border: '2px solid #ffffff',
                        padding: 0,
                        overflow: 'hidden',
                        cursor: 'pointer',
                        flexShrink: 0,
                        backgroundColor: '#ffffff'
                    }}
                >
                    <img
                        src={avatarSrc}
                        alt=""
                        style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                            display: 'block'
                        }}
                    />
                </button>

                {isOpen && (
                    <div style={{
                        position: 'absolute',
                        right: 0,
                        top: '44px',
                        backgroundColor: '#fff4e4',
                        borderRadius: '8px',
                        padding: '8px',
                        minWidth: '120px',
                        border: '1px solid #cccccc'
                    }}>
                        {isLoggedIn ? (
                            <>
                                <Link
                                    href="/me"
                                    onClick={() => setIsOpen(false)}
                                    style={{
                                        color: '#f29f41',
                                        fontWeight: 'bold',
                                        textDecoration: 'none',
                                        display: 'block',
                                        padding: '8px'
                                    }}
                                >
                                    Profile
                                </Link>

                                <Link
                                    href="/me"
                                    onClick={() => setIsOpen(false)}
                                    style={{
                                        color: '#f29f41',
                                        fontWeight: 'bold',
                                        textDecoration: 'none',
                                        display: 'block',
                                        padding: '8px'
                                    }}
                                >
                                    My Works
                                </Link>

                                <Link
                                    href=""
                                    onClick={() => setIsOpen(false)}
                                    style={{
                                        color: '#f29f41',
                                        fontWeight: 'bold',
                                        textDecoration: 'none',
                                        display: 'block',
                                        padding: '8px'
                                    }}
                                >
                                    Settings
                                </Link>

                                <div
                                    onClick={handleLogout}
                                    style={{
                                        color: '#f29f41',
                                        fontWeight: 'bold',
                                        textDecoration: 'none',
                                        display: 'block',
                                        padding: '8px',
                                        cursor: 'pointer'
                                    }}
                                >
                                    Log out
                                </div>
                            </>
                        ) : (
                            <>
                                <Link
                                    href="/login"
                                    onClick={() => setIsOpen(false)}
                                    style={{
                                        color: '#f29f41',
                                        fontWeight: 'bold',
                                        textDecoration: 'none',
                                        display: 'block',
                                        padding: '8px'
                                    }}
                                >
                                    Profile
                                </Link>
                                <Link
                                    href="/login"
                                    onClick={() => setIsOpen(false)}
                                    style={{
                                        color: '#f29f41',
                                        fontWeight: 'bold',
                                        textDecoration: 'none',
                                        display: 'block',
                                        padding: '8px'
                                    }}
                                >
                                    Login
                                </Link>
                            </>
                        )}
                    </div>
                )}
            </div>

        </header>
    )
}