import 'package:coursehub/animations/fade_in_animation.dart';
import 'package:coursehub/models/contribution.dart';
import 'package:coursehub/models/user.dart';
import "package:flutter/material.dart";
import 'package:flutter_staggered_animations/flutter_staggered_animations.dart';
import '../constants/themes.dart';
import '../widgets/profile_screen/contribution_card.dart';
import '../widgets/profile_screen/semester_card.dart';

import '../database/hive_store.dart';

class ProfileScreen extends StatefulWidget {
  const ProfileScreen({Key? key}) : super(key: key);

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  late final User user;
  late final String branch;
  late final List<Contribution> contributionList;

  @override
  void initState() {
    user = HiveStore.getUserDetails();
    branch = calculateBranch(user.rollNumber);
    contributionList = HiveStore.getContribution();
    super.initState();
  }

  @override
  Widget build(BuildContext context) {
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
                child: CustomFadeInAnimation(
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
                    child: AnimationLimiter(
                      child: ListView.builder(
                        itemCount: contributionList.length,
                        itemBuilder: (BuildContext context, int index) {
                          return AnimationConfiguration.staggeredList(
                            position: index,
                            duration: const Duration(milliseconds: 375),
                            child: SlideAnimation(
                              verticalOffset: 50.0,
                              child: FadeInAnimation(
                                child: ContributionCard(
                                  contribution: contributionList[index],
                                ),
                              ),
                            ),
                          );
                        },
                      ),
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
