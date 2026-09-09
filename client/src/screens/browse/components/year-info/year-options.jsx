const currentDate = new Date();

const acadYear = currentDate.getFullYear();

const Yroptions = ({ course }) => {
    const presentYears = [];
    const options = [];
    course.map((year) => presentYears.push(year.name));

    for (let i = 0; i < 5; i++) {
        let yr = (acadYear - i).toString();
        if (!presentYears.includes(yr)) options.push(yr);
    }

    return (
        <>
            {options.map((opt, idx) => {
                return (
                    <option className={"option"} value={opt} key={idx}>
                        {opt}
                    </option>
                );
            })}
        </>
    );
};

export default Yroptions;
