'use client';
import React, { useCallback, useEffect, useState, useContext, useRef, useMemo } from 'react';
import Skeleton from 'react-loading-skeleton';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { databases, Query, ID, client,DATABASE_ID,USERS_ID,CHALLENGES_ID,JOINED_CHALLENGES_ID,FRIENDS_ID,FRIEND_REQUESTS_ID } from '~/appwrite/config';
import { UserContext } from '~/contexts/UserContext';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes, faChevronDown } from '@fortawesome/free-solid-svg-icons';


function ProfileUser() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { userId } = useContext(UserContext);
    const [userData, setUserData] = useState(null);
    const [createdChallenges, setCreatedChallenges] = useState([]);
    const [joinedChallenges, setJoinedChallenges] = useState([]);
    const [initialLoading, setInitialLoading] = useState(true);
    const [visibleCreatedChallenges, setVisibleCreatedChallenges] = useState(5);
    const [visibleJoinedChallenges, setVisibleJoinedChallenges] = useState(3);
    const [friendStatus, setFriendStatus] = useState(null);
    const [friendRequests, setFriendRequests] = useState([]);
    const [pendingRequest, setPendingRequest] = useState(null);
    const [showRequestsModal, setShowRequestsModal] = useState(false);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const unsubscribeRef = useRef(null);

    // Memoized fetchUserData để tránh tạo lại hàm không cần thiết
    const fetchUserData = useMemo(() => {
        return async (isInitial = false) => {
            if (isInitial) setInitialLoading(true);
            try {
                const [
                    userResponse,
                    createdResponse,
                    joinedResponse,
                    friendRequestsResponse,
                    pendingSentRequest,
                    pendingReceivedRequest,
                    friendRelation,
                ] = await Promise.all([
                    databases.getDocument(DATABASE_ID, USERS_ID, id),
                    databases.listDocuments(DATABASE_ID, CHALLENGES_ID, [
                        Query.equal('idUserCreated', id),
                    ]),
                    databases.listDocuments(DATABASE_ID, JOINED_CHALLENGES_ID, [
                        Query.equal('idUserJoined', id),
                    ]),
                    databases.listDocuments(DATABASE_ID, FRIEND_REQUESTS_ID, [
                        Query.equal('receiverId', id),
                        Query.equal('status', 'pending'),
                    ]),
                    databases.listDocuments(DATABASE_ID, FRIEND_REQUESTS_ID, [
                        Query.equal('senderId', userId),
                        Query.equal('receiverId', id),
                        Query.equal('status', 'pending'),
                    ]),
                    databases.listDocuments(DATABASE_ID, FRIEND_REQUESTS_ID, [
                        Query.equal('senderId', id),
                        Query.equal('receiverId', userId),
                        Query.equal('status', 'pending'),
                    ]),
                    databases.listDocuments(DATABASE_ID, FRIENDS_ID, [
                        Query.or([
                            Query.and([Query.equal('userId', userId), Query.equal('friendId', id)]),
                            Query.and([Query.equal('userId', id), Query.equal('friendId', userId)]),
                        ]),
                    ]),
                ]);

                setUserData(userResponse);
                setCreatedChallenges(createdResponse.documents);
                setFriendRequests(friendRequestsResponse.documents);

                // Tối ưu hóa lấy dữ liệu joined challenges
                const joinedChallengesData = await Promise.all(
                    joinedResponse.documents.map(async ({ challengeId, videoURL, describe }) => ({
                        ...(await databases
                            .getDocument(DATABASE_ID, CHALLENGES_ID, challengeId)
                            .catch(() => null)),
                        userVideo: videoURL,
                        userDescribe: describe,
                    })),
                );
                setJoinedChallenges(joinedChallengesData.filter(Boolean));

                // Xác định trạng thái bạn bè một cách hiệu quả
                const relationDoc = friendRelation.documents[0];
                const sentReq = pendingSentRequest.documents[0];
                const receivedReq = pendingReceivedRequest.documents[0];
                setFriendStatus(relationDoc ? 'accepted' : receivedReq ? 'received' : sentReq ? 'pending' : null);
                setPendingRequest(relationDoc ? null : receivedReq || sentReq || null);
            } catch (error) {
                console.error('Lỗi khi lấy dữ liệu:', error);
                alert('Không thể tải dữ liệu. Vui lòng thử lại sau.');
            } finally {
                if (isInitial) setInitialLoading(false);
            }
        };
    }, [id, userId]);

    // Subscription chỉ chạy khi cần
    useEffect(() => {
        if (!userId) return;
        fetchUserData(true); // Tải lần đầu
        const unsubscribe = client.subscribe(
            [
                `databases.${DATABASE_ID}.collections.${FRIEND_REQUESTS_ID}.documents`,
                `databases.${DATABASE_ID}.collections.${FRIENDS_ID}.documents`,
            ],
            (response) => {
                if (response.events.some((event) => event.includes('documents'))) {
                    fetchUserData(false); // Cập nhật không loading
                }
            },
        );
        unsubscribeRef.current = unsubscribe;
        return () => unsubscribeRef.current?.();
    }, [fetchUserData, userId]);

    // Memoized handlers để tránh tạo lại hàm
    const handleAddFriend = useCallback(async () => {
        if (friendStatus) return;
        const requestData = {
            senderId: userId,
            receiverId: id,
            status: 'pending',
            createdAt: new Date().toISOString(),
        };
        try {
            const response = await databases.createDocument(
                DATABASE_ID,
                FRIEND_REQUESTS_ID,
                ID.unique(),
                requestData,
            );
            setFriendStatus('pending');
            setPendingRequest({ ...requestData, $id: response.$id });
            alert('Đã gửi yêu cầu kết bạn!');
        } catch (error) {
            console.error('Lỗi gửi yêu cầu kết bạn:', error);
            alert('Không thể gửi yêu cầu. Vui lòng thử lại.');
        }
    }, [friendStatus, userId, id]);

    const handleCancelRequest = useCallback(async () => {
        if (!pendingRequest) return;
        try {
            await databases.deleteDocument(DATABASE_ID, FRIEND_REQUESTS_ID, pendingRequest.$id);
            setFriendStatus(null);
            setPendingRequest(null);
            alert('Đã hủy yêu cầu kết bạn.');
        } catch (error) {
            console.error('Lỗi hủy yêu cầu:', error);
            alert('Không thể hủy yêu cầu. Vui lòng thử lại.');
        }
    }, [pendingRequest]);

    const handleUnfriend = useCallback(async () => {
        if (friendStatus !== 'accepted') return;
        if (!window.confirm(`Bạn có chắc muốn hủy kết bạn với ${userData?.displayName || id}?`)) return;
        try {
            const relations = await databases.listDocuments(DATABASE_ID, FRIENDS_ID, [
                Query.or([
                    Query.and([Query.equal('userId', userId), Query.equal('friendId', id)]),
                    Query.and([Query.equal('userId', id), Query.equal('friendId', userId)]),
                ]),
            ]);
            await Promise.all(
                relations.documents.map((doc) => databases.deleteDocument(DATABASE_ID, FRIENDS_ID, doc.$id)),
            );
            setFriendStatus(null);
            alert('Đã hủy kết bạn thành công!');
        } catch (error) {
            console.error('Lỗi hủy kết bạn:', error);
            alert('Không thể hủy kết bạn. Vui lòng thử lại.');
        }
    }, [friendStatus, userData, userId, id]);

    const handleAcceptFriend = useCallback(async () => {
        if (!pendingRequest) return;
        try {
            await databases.deleteDocument(DATABASE_ID, FRIEND_REQUESTS_ID, pendingRequest.$id);
            await Promise.all([
                databases.createDocument(DATABASE_ID, FRIENDS_ID, ID.unique(), {
                    userId,
                    friendId: pendingRequest.senderId,
                    createdAt: new Date().toISOString(),
                }),
                databases.createDocument(DATABASE_ID, FRIENDS_ID, ID.unique(), {
                    userId: pendingRequest.senderId,
                    friendId: userId,
                    createdAt: new Date().toISOString(),
                }),
            ]);
            setFriendStatus('accepted');
            setPendingRequest(null);
            setIsDropdownOpen(false);
            alert('Đã chấp nhận yêu cầu kết bạn!');
        } catch (error) {
            console.error('Lỗi chấp nhận yêu cầu:', error);
            alert('Không thể chấp nhận yêu cầu. Vui lòng thử lại.');
        }
    }, [pendingRequest, userId]);

    const handleRejectFriend = useCallback(async () => {
        if (!pendingRequest) return;
        try {
            await databases.deleteDocument(DATABASE_ID, FRIEND_REQUESTS_ID, pendingRequest.$id);
            setFriendStatus(null);
            setPendingRequest(null);
            setIsDropdownOpen(false);
            alert('Đã từ chối yêu cầu kết bạn.');
        } catch (error) {
            console.error('Lỗi từ chối yêu cầu:', error);
            alert('Không thể từ chối yêu cầu. Vui lòng thử lại.');
        }
    }, [pendingRequest]);

    // Memoized các giá trị thường xuyên sử dụng
    const isSelfProfile = useMemo(() => userId === id, [userId, id]);
    const friendButtonText = useMemo(
        () =>
            ({
                accepted: 'Hủy kết bạn',
                pending: 'Hủy yêu cầu',
                null: 'Kết bạn',
            }[friendStatus] || ''),
        [friendStatus],
    );

    if (initialLoading) {
        return (
            <div className="container mx-auto mt-8 mb-[90px] p-6 bg-white rounded-lg shadow">
                <div className="flex items-center">
                    <Skeleton circle height={100} width={100} />
                    <Skeleton width={180} height={30} className="ml-4" />
                </div>
                <div className="mt-10">
                    <Skeleton width={152} height={23} />
                    <div className="grid grid-cols-3 gap-4 mt-4">
                        {Array(3)
                            .fill()
                            .map((_, i) => (
                                <Skeleton key={i} width={402} height={69} />
                            ))}
                    </div>
                </div>
                <div className="mt-10">
                    <Skeleton width={173} height={23} />
                    <Skeleton width={100} height={18} />
                    <div className="mt-2 space-y-2">
                        {Array(4)
                            .fill()
                            .map((_, i) => (
                                <Skeleton key={i} height={69} />
                            ))}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="container mx-auto mt-8 mb-[90px] p-6 bg-white rounded-lg shadow">
            <div className="flex items-center justify-between">
                <div className="flex items-center">
                    <img
                        width={100}
                        height={100}
                        className="rounded-full"
                        src={userData.imgUser}
                        alt="Avatar"
                    />
                    <h1 className="text-5xl font-bold ml-4">{userData.displayName}</h1>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => navigate(`/chat?user=${userData.$id}`)}
                        className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors"
                    >
                        Nhắn tin
                    </button>
                    {!isSelfProfile &&
                        (friendStatus === 'received' ? (
                            <div className="relative">
                                <button
                                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                                    className="bg-yellow-500 text-white px-4 py-2 rounded-lg hover:bg-yellow-600 transition-colors flex items-center"
                                >
                                    Phản hồi
                                    <FontAwesomeIcon icon={faChevronDown} className="ml-2" />
                                </button>
                                {isDropdownOpen && (
                                    <div className="absolute right-0 mt-2 w-32 bg-white rounded-lg shadow-lg z-10">
                                        <button
                                            onClick={handleAcceptFriend}
                                            className="block w-full text-left px-4 py-2 text-green-500 hover:bg-gray-100"
                                        >
                                            Đồng ý
                                        </button>
                                        <button
                                            onClick={handleRejectFriend}
                                            className="block w-full text-left px-4 py-2 text-red-500 hover:bg-gray-100"
                                        >
                                            Từ chối
                                        </button>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <button
                                onClick={
                                    friendStatus === 'pending'
                                        ? handleCancelRequest
                                        : friendStatus === 'accepted'
                                        ? handleUnfriend
                                        : handleAddFriend
                                }
                                className={`px-4 py-2 rounded-lg transition-colors ${
                                    friendStatus === 'accepted'
                                        ? 'bg-red-500 text-white hover:bg-red-600'
                                        : friendStatus === 'pending'
                                        ? 'bg-gray-500 text-white hover:bg-gray-600'
                                        : 'bg-blue-500 text-white hover:bg-blue-600'
                                }`}
                            >
                                {friendButtonText}
                            </button>
                        ))}
                    {isSelfProfile && friendRequests.length > 0 && (
                        <button
                            onClick={() => setShowRequestsModal(true)}
                            className="bg-purple-500 text-white px-4 py-2 rounded-lg hover:bg-purple-600 transition-colors"
                        >
                            Xem yêu cầu kết bạn ({friendRequests.length})
                        </button>
                    )}
                </div>
                {showRequestsModal && (
                    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
                        <div className="bg-white p-5 rounded-lg shadow-lg w-96">
                            <div className="flex justify-between items-center border-b pb-2">
                                <h3 className="text-xl font-bold">Yêu cầu kết bạn</h3>
                                <button
                                    onClick={() => setShowRequestsModal(false)}
                                    className="text-gray-500 hover:text-gray-800"
                                >
                                    <FontAwesomeIcon icon={faTimes} />
                                </button>
                            </div>
                            <ul className="mt-4 space-y-2">
                                {friendRequests.map((request) => (
                                    <li key={request.$id} className="flex justify-between items-center">
                                        <span>{request.senderId} muốn kết bạn với bạn</span>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={handleAcceptFriend}
                                                className="bg-green-500 text-white px-2 py-1 rounded hover:bg-green-600"
                                            >
                                                Chấp nhận
                                            </button>
                                            <button
                                                onClick={handleRejectFriend}
                                                className="bg-red-500 text-white px-2 py-1 rounded hover:bg-red-600"
                                            >
                                                Từ chối
                                            </button>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                )}
            </div>

            <div className="mt-10">
                <h2 className="text-3xl font-semibold">Thông tin cá nhân</h2>
                <div className="grid grid-cols-3 gap-4 mt-4">
                    <div className="bg-gray-100 p-4 rounded-lg text-center">
                        <h3 className="font-bold">Thử thách đã tạo:</h3>
                        <p className="text-2xl">{createdChallenges.length}</p>
                    </div>
                    <div className="bg-gray-100 p-4 rounded-lg text-center">
                        <h3 className="font-bold">Thử thách đã tham gia:</h3>
                        <p className="text-2xl">{joinedChallenges.length}</p>
                    </div>
                    <div className="bg-gray-100 p-4 rounded-lg text-center">
                        <h3 className="font-bold">Điểm:</h3>
                        <p className="text-2xl">{userData.points || 0} điểm</p>
                    </div>
                </div>

                <h2 className="text-3xl mt-5 font-semibold">Danh sách thử thách</h2>
                <h3 className="text-xl mt-4 font-bold">Thử thách đã tạo:</h3>
                {createdChallenges.length ? (
                    <div>
                        <ul className="mt-2 space-y-2">
                            {createdChallenges.slice(0, visibleCreatedChallenges).map((challenge) => (
                                <Link
                                    to={`/challenge/${challenge.$id}`}
                                    key={challenge.$id}
                                    className="flex items-center justify-between bg-white p-3 rounded-lg shadow hover:bg-gray-50 transition-colors"
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
                        {visibleCreatedChallenges < createdChallenges.length && (
                            <button
                                className="mt-4 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition-colors"
                                onClick={() => setVisibleCreatedChallenges((prev) => prev + 5)}
                            >
                                Xem thêm
                            </button>
                        )}
                        {visibleCreatedChallenges > 5 && createdChallenges.length > 5 && (
                            <button
                                className="mt-4 bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600 transition-colors"
                                onClick={() => setVisibleCreatedChallenges(5)}
                            >
                                Ẩn bớt
                            </button>
                        )}
                    </div>
                ) : (
                    <p className="mt-2 text-gray-500">Người dùng chưa tạo thử thách nào.</p>
                )}
            </div>

            <div className="mt-10">
                <h3 className="text-xl mt-4 font-bold">Thử thách đã tham gia:</h3>
                {joinedChallenges.length ? (
                    <div>
                        <ul className="grid grid-cols-3 gap-4 mt-2">
                            {joinedChallenges.slice(0, visibleJoinedChallenges).map((challenge) => (
                                <Link
                                    to={`/challenge/${challenge.$id}`}
                                    key={challenge.$id}
                                    className="flex flex-col bg-white p-4 rounded-lg shadow hover:bg-gray-50 transition-colors"
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
                                        />
                                        <p className="text-gray-600 mt-2">Mô tả: {challenge.userDescribe}</p>
                                    </div>
                                </Link>
                            ))}
                        </ul>
                        {visibleJoinedChallenges < joinedChallenges.length && (
                            <button
                                className="mt-4 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition-colors"
                                onClick={() => setVisibleJoinedChallenges((prev) => prev + 3)}
                            >
                                Xem thêm
                            </button>
                        )}
                        {visibleJoinedChallenges > 3 && joinedChallenges.length > 3 && (
                            <button
                                className="mt-4 bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600 transition-colors"
                                onClick={() => setVisibleJoinedChallenges(3)}
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
