import "package:flutter/material.dart";
import '../constants/themes.dart';
import '../widgets/profile_screen/contribution_card.dart';
import '../widgets/profile_screen/semester_card.dart';

import '../database/hive_store.dart';

class ProfileScreen extends StatelessWidget {
  const ProfileScreen({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    final user = HiveStore.getUserDetails();
    final branch = calculateBranch(user.rollNumber);
    final contributionList = HiveStore.getContribution();

    return Scaffold(
      body: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.end,
        children: [
          Stack(
            alignment: Alignment.bottomCenter,
            children: [
              Container(
                width: double.infinity,
                padding: const EdgeInsets.only(
                    left: 30, top: 30, right: 20, bottom: 0),
                color: Colors.black,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      "MY PROFILE",
                      style: TextStyle(
                        fontFamily: 'ProximaNova',
                        fontWeight: FontWeight.w700,
                        fontSize: 16,
                        color: Colors.white,
                      ),
                    ),
                    const SizedBox(
                      height: 16.0,
                    ),
                    Text(
                      user.name,
                      style: Themes.theme.textTheme.displayLarge,
                    ),
                    const SizedBox(
                      height: 10,
                    ),
                    FittedBox(
                      child: Text(
                        "B.Tech in $branch",
                        style: const TextStyle(
                          fontFamily: 'ProximaNova',
                          fontWeight: FontWeight.w400,
                          fontSize: 16,
                          color: Colors.white,
                        ),
                      ),
                    ),
                    const SizedBox(
                      height: 20,
                    ),
                    const SizedBox(
                      height: 25,
                    ),
                    SemesterCard(sem: user.semester),
                    const SizedBox(
                      height: 100,
                    )
                  ],
                ),
              ),
              Image.asset(
                'assets/my_profile.png',
                fit: BoxFit.scaleDown,
              ),
            ],
          ),
          const Padding(
            padding: EdgeInsets.only(left: 20, top: 30),
            child: Text(
              "MY CONTRIBUTIONS",
              style: TextStyle(
                fontFamily: 'ProximaNova',
                fontWeight: FontWeight.w700,
                fontSize: 16,
                color: Colors.black,
              ),
            ),
          ),
          contributionList.isNotEmpty
              ? Expanded(
                  child: Padding(
                    padding: const EdgeInsets.symmetric(
                        horizontal: 16, vertical: 20),
                    child: ListView.builder(
                      physics: const BouncingScrollPhysics(),
                      itemBuilder: (context, index) => ContributionCard(
                        contribution: contributionList[index],
                      ),
                      itemCount: contributionList.length,
                    ),
                  ),
                )
              : Expanded(
                  child: Center(
                      child: Column(
                    mainAxisSize: MainAxisSize.min,
                    crossAxisAlignment: CrossAxisAlignment.center,
                    children: [
                      Image.asset(
                        'assets/my_profile_no_contri.png',
                        width: 120,
                      ),
                      const Text(
                        'Nothing Here!',
                        style: TextStyle(
                            fontSize: 20,
                            fontWeight: FontWeight.w400,
                            color: Colors.black),
                      )
                    ],
                  )),
                )
        ],
      ),
    );
  }
}
