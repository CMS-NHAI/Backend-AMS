export const getEmployeesHierarchy = async (userId) => {

    const employees = await prisma.user_master.findMany({
        where: {
            parent_id: userId
        },
        select: { user_id: true }
    })
    let totalCount = employees.length;
    console.log(totalCount, "totalCount")
    for (const user of employees) {
        const childData = await getEmployeesHierarchy(user.user_id); // Recursive call
        user.children = childData.hierarchy; // Assign children
        totalCount += childData.totalCount; // Add child count
    }

    return { hierarchy: employees, totalCount };
}


export const getAttendanceForHierarchy = async (hierarchy) => {
    // Step 1: Flatten the hierarchy to get all user_ids
    await extractUserIds(hierarchy);
}

const extractUserIds = async (users) => {
    const userIds = [];
    users.forEach(async user => {
        userIds.push(user.user_id); // Add the user_id of the current user
        if (user.children && user.children.length > 0) {
            await extractUserIds(user.children); // Recursively add children user_ids
        }
    });
}