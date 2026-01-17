import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Badge IDs for challenge rewards
const BADGE_IDS = {
  CLASS_CHAMPION: '949bcaec-0174-47d4-9957-5fbd0df3545b', // 班级冠军
  CLASS_RUNNER_UP: 'd33b752e-4bbd-42ec-a55d-f57c2129f8b4', // 班级亚军
  CLASS_THIRD: '00cac967-ab7f-46a9-8d24-9845ddf0b4d4', // 班级季军
  GRADE_STAR: 'deebd12a-2ce0-4e40-9a11-e7fa0131d10d', // 年级之星
  GRADE_PIONEER: 'b963aedb-c93f-43a0-9d8c-4e38d4d31bd2', // 年级先锋
}

// Coin rewards for each rank
const COIN_REWARDS = {
  CLASS: {
    1: 500,
    2: 300,
    3: 150,
  },
  GRADE: {
    1: 1000,
    2: 600,
    3: 300,
  },
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    console.log('Starting season rewards distribution...')

    // Find seasons that have ended but not yet processed
    const now = new Date().toISOString()
    const { data: endedSeasons, error: seasonError } = await supabase
      .from('seasons')
      .select('*')
      .lt('end_date', now)
      .eq('is_active', true)

    if (seasonError) {
      console.error('Error fetching ended seasons:', seasonError)
      throw seasonError
    }

    if (!endedSeasons || endedSeasons.length === 0) {
      console.log('No ended seasons to process')
      return new Response(
        JSON.stringify({ success: true, message: 'No ended seasons to process' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    let totalRewardsDistributed = 0

    for (const season of endedSeasons) {
      console.log(`Processing season: ${season.name} (ID: ${season.id})`)

      // Get top 3 classes for this season
      const { data: topClasses, error: classError } = await supabase
        .from('class_challenges')
        .select('*')
        .eq('season_id', season.id)
        .order('rank_position', { ascending: true })
        .limit(3)

      if (classError) {
        console.error('Error fetching top classes:', classError)
        continue
      }

      // Get top 3 grades for this season
      const { data: topGrades, error: gradeError } = await supabase
        .from('grade_challenges')
        .select('*')
        .eq('season_id', season.id)
        .order('rank_position', { ascending: true })
        .limit(3)

      if (gradeError) {
        console.error('Error fetching top grades:', gradeError)
        continue
      }

      // Award class rewards
      for (let i = 0; i < topClasses.length; i++) {
        const classData = topClasses[i]
        const rank = i + 1
        const coinReward = COIN_REWARDS.CLASS[rank as 1 | 2 | 3]
        
        // Get badge ID based on rank
        let badgeId: string
        switch (rank) {
          case 1:
            badgeId = BADGE_IDS.CLASS_CHAMPION
            break
          case 2:
            badgeId = BADGE_IDS.CLASS_RUNNER_UP
            break
          case 3:
            badgeId = BADGE_IDS.CLASS_THIRD
            break
          default:
            continue
        }

        // Get all members of this class
        const { data: classMembers, error: memberError } = await supabase
          .from('profiles')
          .select('id, coins')
          .eq('grade', classData.grade)
          .eq('class', classData.class_name)

        if (memberError) {
          console.error(`Error fetching class members for ${classData.class_name}:`, memberError)
          continue
        }

        console.log(`Awarding ${classMembers?.length || 0} members of class ${classData.class_name} (rank ${rank})`)

        // Award each member
        for (const member of classMembers || []) {
          // Award coins
          await supabase
            .from('profiles')
            .update({ coins: (member.coins || 0) + coinReward })
            .eq('id', member.id)

          // Award badge (ignore duplicates)
          const { error: badgeError } = await supabase
            .from('user_badges')
            .insert({
              profile_id: member.id,
              badge_id: badgeId,
            })
          
          if (badgeError && !badgeError.message.includes('duplicate')) {
            console.error(`Error awarding badge to ${member.id}:`, badgeError)
          }

          // Record challenge reward
          await supabase
            .from('challenge_rewards')
            .insert({
              profile_id: member.id,
              season_id: season.id,
              challenge_type: 'class',
              rank_achieved: rank,
              reward_type: 'coins',
              reward_value: coinReward,
              claimed: true,
            })

          totalRewardsDistributed++
        }
      }

      // Award grade rewards
      for (let i = 0; i < topGrades.length; i++) {
        const gradeData = topGrades[i]
        const rank = i + 1
        const coinReward = COIN_REWARDS.GRADE[rank as 1 | 2 | 3]
        
        // Get badge ID based on rank
        let badgeId: string
        switch (rank) {
          case 1:
            badgeId = BADGE_IDS.GRADE_STAR
            break
          case 2:
          case 3:
            badgeId = BADGE_IDS.GRADE_PIONEER
            break
          default:
            continue
        }

        // Get all members of this grade
        const { data: gradeMembers, error: memberError } = await supabase
          .from('profiles')
          .select('id, coins')
          .eq('grade', gradeData.grade)

        if (memberError) {
          console.error(`Error fetching grade members for grade ${gradeData.grade}:`, memberError)
          continue
        }

        console.log(`Awarding ${gradeMembers?.length || 0} members of grade ${gradeData.grade} (rank ${rank})`)

        // Award each member
        for (const member of gradeMembers || []) {
          // Award coins
          await supabase
            .from('profiles')
            .update({ coins: (member.coins || 0) + coinReward })
            .eq('id', member.id)

          // Award badge (ignore duplicates)
          const { error: badgeError } = await supabase
            .from('user_badges')
            .insert({
              profile_id: member.id,
              badge_id: badgeId,
            })
          
          if (badgeError && !badgeError.message.includes('duplicate')) {
            console.error(`Error awarding badge to ${member.id}:`, badgeError)
          }

          // Record challenge reward
          await supabase
            .from('challenge_rewards')
            .insert({
              profile_id: member.id,
              season_id: season.id,
              challenge_type: 'grade',
              rank_achieved: rank,
              reward_type: 'coins',
              reward_value: coinReward,
              claimed: true,
            })

          totalRewardsDistributed++
        }
      }

      // Mark season as inactive (processed)
      await supabase
        .from('seasons')
        .update({ is_active: false })
        .eq('id', season.id)

      console.log(`Season ${season.name} processed and marked as inactive`)
    }

    console.log(`Season rewards distribution complete. Total rewards: ${totalRewardsDistributed}`)

    return new Response(
      JSON.stringify({
        success: true,
        message: `Processed ${endedSeasons.length} ended seasons`,
        totalRewardsDistributed,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error in award-season-rewards:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
