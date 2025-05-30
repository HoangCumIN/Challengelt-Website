'use client';
import React, { useEffect, useState } from 'react';
import { DATABASE_ID, databases, DEFAULT_IMG, USERS_ID } from '~/appwrite/config';
import { Link } from 'react-router-dom';

function Leaderboard() {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchUsers = async () => {
            try {
                const response = await databases.listDocuments(
                    DATABASE_ID, // Database ID
                    USERS_ID, // Collection "users"
                );

                // Lọc những người có điểm > 0 và sắp xếp giảm dần
                const filteredUsers = response.documents
                    .filter((user) => user.points > 0)
                    .sort((a, b) => b.points - a.points)
                    .slice(0, 10); // Giới hạn Top 10

                setUsers(filteredUsers);
            } catch (error) {
                console.error('Lỗi khi lấy dữ liệu người dùng:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchUsers();
    }, []);

    if (loading) return <p className="text-center text-xl">Đang tải bảng xếp hạng...</p>;

    return (
        <div className="container mx-auto mt-8 mb-32 p-6 bg-white rounded-lg shadow">
            <h1 className="text-4xl font-bold text-center mb-6">🏆 Bảng Xếp Hạng</h1>
            <table className="w-full border-collapse border border-gray-300">
                <thead>
                    <tr className="bg-[#f86666] text-white">
                        <th className="p-3 border border-gray-300">#</th>
                        <th className="p-3 border border-gray-300">Người Dùng</th>
                        <th className="p-3 border border-gray-300">Điểm</th>
                    </tr>
                </thead>
                <tbody>
                    {users.length > 0 ? (
                        users.map((user, index) => (
                            <tr key={user.$id} className="text-center hover:bg-gray-100">
                                <td className="p-3 border border-gray-300 font-bold">{index + 1}</td>
                                <td className="p-3 border border-gray-300 flex items-center justify-center">
                                    <img
                                        src={user.imgUser || DEFAULT_IMG}
                                        alt="Avatar"
                                        className="w-10 h-10 rounded-full mr-2"
                                    />
                                    <Link to={`/profile/${user.$id}`}>
                                        <span className="text-blue-600 font-semibold">{user.displayName}</span>
                                    </Link>
                                </td>
                                <td className="p-3 border border-gray-300 font-bold text-red-600">{user.points}</td>
                            </tr>
                        ))
                    ) : (
                        <tr>
                            <td colSpan="3" className="text-center p-4 text-gray-500">
                                Không có người dùng nào có điểm số.
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    );
}

export default Leaderboard;
