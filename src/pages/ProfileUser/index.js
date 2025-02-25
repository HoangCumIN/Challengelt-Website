'use client';
import React, { useCallback, useEffect, useState } from 'react';
import Skeleton from 'react-loading-skeleton';
import { useParams, Link } from 'react-router-dom';
import { databases, Query } from '~/appwrite/config';

function ProfileUser() {
    const { id } = useParams(); // Lấy ID từ URL
    const [userData, setUserData] = useState(null);
    const [createdChallenges, setCreatedChallenges] = useState([]);
    const [joinedChallenges, setJoinedChallenges] = useState([]);
    const [loading, setLoading] = useState(true);
    const [visibleCreatedChallenges, setVisibleCreatedChallenges] = useState(5);
    const [visibleJoinedChallenges, setVisibleJoinedChallenges] = useState(3);

    const fetchUserData = useCallback(async () => {
        try {
            const [userResponse, createdResponse, joinedResponse] = await Promise.all([
                databases.getDocument('678a0e0000363ac81b93', '678a207f00308710b3b2', id),
                databases.listDocuments('678a0e0000363ac81b93', '678a0fc8000ab9bb90be', [
                    Query.equal('idUserCreated', id),
                ]),
                databases.listDocuments('678a0e0000363ac81b93', '679c498f001b467ed632', [
                    Query.equal('idUserJoined', id),
                ]),
            ]);

            setUserData(userResponse);
            setCreatedChallenges(createdResponse.documents);

            // 🔹 4. Lấy thông tin thử thách từ collection "challenges"
            const joinedChallengesData = await Promise.all(
                joinedResponse.documents.map(async (entry) => {
                    try {
                        const challengeData = await databases.getDocument(
                            '678a0e0000363ac81b93',
                            '678a0fc8000ab9bb90be',
                            entry.challengeId,
                        );

                        return {
                            ...challengeData,
                            userVideo: entry.videoURL, // Video của người tham gia
                            userDescribe: entry.describe, // Mô tả của người tham gia
                        };
                    } catch (error) {
                        console.error('Lỗi khi lấy thử thách đã tham gia:', error);
                        return null;
                    }
                }),
            );

            // 🔹 5. Lọc thử thách hợp lệ và cập nhật state
            setJoinedChallenges(joinedChallengesData.filter(Boolean));
        } catch (error) {
            console.error('Lỗi khi lấy dữ liệu người dùng:', error);
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => {
        fetchUserData();
    }, [fetchUserData]);

    const handleShowMoreCreatedChallenges = () => {
        setVisibleCreatedChallenges((prev) => prev + 5);
    };

    const handleShowLessCreatedChallenges = () => {
        setVisibleCreatedChallenges(5);
    };

    const handleShowMoreJoinedChallenges = () => {
        setVisibleJoinedChallenges((prev) => prev + 3);
    };

    const handleShowLessJoinedChallenges = () => {
        setVisibleJoinedChallenges(3);
    };

    if (loading) {
        return (
            <div className="relative container mx-auto mt-8 mb-[90px] p-6 bg-white rounded-lg shadow">
                <div className="flex items-center">
                    <Skeleton circle={true} height={100} width={100} />
                    <Skeleton width={180} height={30} className="ml-4"></Skeleton>
                </div>
                <div className="mt-10">
                    <Skeleton width={152} height={23}></Skeleton>
                    <div className="grid grid-cols-3 gap-4 mt-4">
                        <Skeleton className="p-4" width={402} height={69}></Skeleton>
                        <Skeleton className="p-4" width={402} height={69}></Skeleton>
                        <Skeleton className="p-4" width={402} height={69}></Skeleton>
                    </div>
                </div>
                <div className="mt-10">
                    <Skeleton width={173} height={23}></Skeleton>
                    <Skeleton width={100} height={18}></Skeleton>
                    <div className="mt-2 space-y-2">
                        <Skeleton className="p-3 mb-2" height={69}></Skeleton>
                        <Skeleton className="p-3 mb-2" height={69}></Skeleton>
                        <Skeleton className="p-3 mb-2" height={69}></Skeleton>
                        <Skeleton className="p-3 mb-2" height={69}></Skeleton>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="container mx-auto mt-8 mb-[90px] p-6 bg-white rounded-lg shadow">
            <div className="flex items-center">
                <img width={100} height={100} className="rounded-full" src={userData.imgUser} alt="Avatar" />
                <h1 className="text-5xl font-bold ml-4">{userData.displayName}</h1>
            </div>

            {/* Thử thách đã tạo */}
            <div className="mt-10">
                <h2 className="text-3xl font-semibold">Thông tin cá nhân</h2>
                <div className="grid grid-cols-3 gap-4 mt-4">
                    <div className="bg-gray-100 p-4 rounded-lg text-center">
                        <h3 className="font-bold">Thử thách đã tạo:</h3>
                        <p className="text-2xl">{createdChallenges.length || 0}</p>
                    </div>
                    <div className="bg-gray-100 p-4 rounded-lg text-center">
                        <h3 className="font-bold">Thử thách đã tham gia:</h3>
                        <p className="text-2xl">{joinedChallenges.length || 0}</p>
                    </div>
                    <div className="bg-gray-100 p-4 rounded-lg text-center">
                        <h3 className="font-bold">Điểm:</h3>
                        <p className="text-2xl">{userData.points || 0} điểm</p>
                    </div>
                </div>
                <h2 className="text-3xl mt-5 font-semibold">Danh sách thử thách</h2>
                <h3 className="text-xl mt-4 font-bold">Thử thách đã tạo:</h3>
                {createdChallenges.length > 0 ? (
                    <div>
                        <ul className="mt-2 space-y-2">
                            {createdChallenges.slice(0, visibleCreatedChallenges).map((challenge) => (
                                <Link
                                    to={`/challenge/${challenge.$id}`}
                                    key={challenge.$id}
                                    className="flex items-center justify-between bg-white p-3 rounded-lg shadow"
                                >
                                    <div>
                                        <p className="font-bold">{challenge.nameChallenge}</p>
                                        <p className="text-sm text-gray-500">{challenge.field}</p>
                                        <p className="text-sm text-blue-500">
                                            {challenge.participants > 0
                                                ? `${challenge.participants} người tham gia`
                                                : 'Chưa có người tham gia'}
                                        </p>
                                    </div>
                                </Link>
                            ))}
                        </ul>
                        {visibleCreatedChallenges < createdChallenges.length ? (
                            <button
                                className="mt-4 bg-blue-500 text-white px-4 py-2 rounded"
                                onClick={handleShowMoreCreatedChallenges}
                            >
                                Xem thêm
                            </button>
                        ) : (
                            <button
                                className="mt-4 bg-gray-500 text-white px-4 py-2 rounded"
                                onClick={handleShowLessCreatedChallenges}
                            >
                                Ẩn bớt
                            </button>
                        )}
                    </div>
                ) : (
                    <p className="mt-2 text-gray-500">Người dùng chưa tạo thử thách nào.</p>
                )}
            </div>

            {/* Thử thách đã tham gia */}
            <div className="mt-10">
                <h3 className="text-xl mt-4 font-bold">Thử thách đã tham gia:</h3>
                {joinedChallenges.length > 0 ? (
                    <div>
                        <ul className="grid grid-cols-3 gap-4 mt-2 space-y-2">
                            {joinedChallenges.slice(0, visibleJoinedChallenges).map((challenge) => (
                                <Link
                                    to={`/challenge/${challenge.$id}`}
                                    key={challenge.$id}
                                    className="flex flex-col bg-white p-4 rounded-lg shadow"
                                >
                                    <div>
                                        <p className="font-bold text-xl">{challenge.nameChallenge}</p>
                                        <p className="text-sm text-gray-500">{challenge.field}</p>
                                        <p className="text-sm text-blue-500">{challenge.participants} người tham gia</p>
                                        <video
                                            src={challenge.userVideo}
                                            loading="lazy"
                                            controls
                                            className="w-full h-[200px] mt-2 rounded-lg"
                                        ></video>
                                        <p className="text-gray-600 mt-2">Mô tả: {challenge.userDescribe}</p>
                                    </div>
                                </Link>
                            ))}
                        </ul>
                        {visibleJoinedChallenges < joinedChallenges.length ? (
                            <button
                                className="mt-4 bg-blue-500 text-white px-4 py-2 rounded"
                                onClick={handleShowMoreJoinedChallenges}
                            >
                                Xem thêm
                            </button>
                        ) : (
                            <button
                                className="mt-4 bg-gray-500 text-white px-4 py-2 rounded"
                                onClick={handleShowLessJoinedChallenges}
                            >
                                Ẩn bớt
                            </button>
                        )}
                    </div>
                ) : (
                    <p className="mt-2 text-gray-500">Người dùng chưa tham gia thử thách nào.</p>
                )}
            </div>
        </div>
    );
}

export default ProfileUser;
