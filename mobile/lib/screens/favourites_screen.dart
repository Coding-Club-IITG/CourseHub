import 'package:coursehub/animations/fade_in_animation.dart';
import 'package:coursehub/models/favourites.dart';
import 'package:coursehub/widgets/common/nav_bar.dart';
import 'package:flutter/material.dart';
import 'package:flutter_staggered_animations/flutter_staggered_animations.dart';

import '../constants/themes.dart';
import '../database/hive_store.dart';
import '../widgets/common/custom_linear_progress.dart';
import '../widgets/favourite_screen/favourite_tile.dart';

class FavouritesScreen extends StatefulWidget {
  final Function(int a) returnToPageCallback;

  const FavouritesScreen({
    super.key,
    required this.returnToPageCallback,
  });

  @override
  State<FavouritesScreen> createState() => _FavouritesScreenState();
}

class _FavouritesScreenState extends State<FavouritesScreen> {
  var _isLoading = false;
  late final List<Favourite> favourites;
  bool _groupByCourses = false;

  void setloading() {
    setState(() {
      _isLoading = !_isLoading;
    });
  }

  @override
  void initState() {
    favourites = HiveStore.getFavourites();
    super.initState();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Column(
        children: [
          NavBar(
            searchCallback: widget.returnToPageCallback,
          ),
          const SizedBox(
            height: 10,
          ),
          Row(
            children: [
              const SizedBox(
                width: 15,
              ),
              Checkbox(
                value: _groupByCourses,
                fillColor: MaterialStateProperty.all(Colors.transparent),
                side: MaterialStateBorderSide.resolveWith(
                  (states) => const BorderSide(width: 2.0, color: Colors.black),
                ),
                checkColor: Colors.black,
                onChanged: (_) => {
                  setState(
                    () {
                      _groupByCourses = !_groupByCourses;
                    },
                  )
                },
              ),
           
              const Text(
                'Group By Course',
                style: TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w700,
                    color: Colors.black),
              )
            ],
          ),
          Expanded(
            child: CustomFadeInAnimation(
              child: favourites.isEmpty
                  ? const EmptyList()
                  : Stack(
                      children: [
                        Padding(
                          padding: const EdgeInsets.symmetric(
                              vertical: 10, horizontal: 12),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const SizedBox(
                                height: 10.0,
                              ),
                              Expanded(
                                child: AnimationLimiter(
                                  child: ListView.builder(
                                      itemCount: favourites.length + 1,
                                      itemBuilder:
                                          (BuildContext context, int index) {
                                        if (index >= favourites.length) {
                                          return Center(
                                            child: Image.asset(
                                              'assets/favourites.png',
                                              height: 280,
                                            ),
                                          );
                                        } else {
                                          return AnimationConfiguration
                                              .staggeredList(
                                            position: index,
                                            duration: const Duration(
                                                milliseconds: 375),
                                            child: SlideAnimation(
                                              verticalOffset: 50.0,
                                              child: FadeInAnimation(
                                                child: FavouriteTile(
                                                  setLoadingCallback:
                                                      setloading,
                                                  favourite: favourites[index],
                                                ),
                                              ),
                                            ),
                                          );
                                        }
                                      }),
                                ),
                              ),
                            ],
                          ),
                        ),
                        Visibility(
                          visible: _isLoading,
                          child: const CustomLinearProgress(
                            text: 'Generating Preview Link',
                          ),
                        )
                      ],
                    ),
            ),
          ),
        ],
      ),
    );
  }
}

class EmptyList extends StatelessWidget {
  const EmptyList({super.key});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Text(
            'Nothing Here!',
            style: Themes.darkTextTheme.displayLarge,
          ),
          const SizedBox(
            height: 15,
          ),
          const Text(
            'Click on the "star" icon next to any\n file to add files to your favourites',
            textAlign: TextAlign.center,
            style: TextStyle(
              fontWeight: FontWeight.w400,
              color: Color.fromRGBO(108, 108, 108, 1),
              fontSize: 14.0,
            ),
          ),
          const SizedBox(
            height: 20,
          ),
          Image.asset(
            'assets/my_profile_no_contri.png',
            width: 300,
          ),
        ],
      ),
    );
  }
}
